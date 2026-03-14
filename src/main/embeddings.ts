/**
 * Local vector embedding service for semantic search.
 *
 * Uses @xenova/transformers with the Xenova/all-MiniLM-L6-v2 model
 * (384-dimensional, ~23 MB quantized). The model is downloaded once and
 * cached in <userData>/models — entirely local, no API key needed.
 *
 * Background indexer:
 *   - On startup: queries DB for unindexed thoughts → enqueues them
 *   - On create/update: enqueues that thought immediately
 *   - Processes one thought at a time, yielding the event loop between each
 *   - Broadcasts INDEX_PROGRESS events to the renderer as it works
 */

import { app, BrowserWindow } from 'electron'
import path from 'path'
import { IPC } from '../shared/types'
import {
  dbGetThought, dbUpsertEmbedding, dbGetUnindexedThoughts,
  dbGetAllEmbeddings, dbGetIndexStatus, dbSemanticSearch
} from './database'
import type { ThoughtWithScore, IndexStatus } from '../shared/types'

// ── Model singleton ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _extractor: any = null
let _loading = false
let _initPromise: Promise<unknown> | null = null

async function getEmbedder() {
  if (_extractor) return _extractor
  if (_initPromise) return _initPromise

  _loading = true
  _initPromise = (async () => {
    // Dynamic import avoids bundling ESM-only internals into the CJS main bundle
    const { pipeline, env } = await import('@xenova/transformers')
    // Cache models in userData so they persist and stay off iCloud Drive
    env.cacheDir = path.join(app.getPath('userData'), 'models')
    // Force Node.js backend (onnxruntime-node) instead of WASM
    env.backends.onnx.wasm.numThreads = 1
    _extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true
    })
    _loading = false
    return _extractor
  })()

  return _initPromise
}

// ── Core helpers ──────────────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function embed(text: string): Promise<Float32Array> {
  const embedder = await getEmbedder()
  const output = await embedder(text.slice(0, 512), { pooling: 'mean', normalize: true })
  return new Float32Array(output.data)
}

// ── Background indexer ────────────────────────────────────────────────────────

const queue: Set<string> = new Set()
let _processing = false
let _win: BrowserWindow | null = null

export function queueThought(id: string): void {
  queue.add(id)
  if (!_processing) scheduleNext()
}

function getStatus(): IndexStatus {
  const { indexed, total } = dbGetIndexStatus()
  return { indexed, total, loading: _loading || _processing }
}

function broadcast(status: IndexStatus): void {
  if (_win && !_win.isDestroyed()) {
    _win.webContents.send(IPC.INDEX_PROGRESS, status)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function scheduleNext(): void {
  setImmediate(() => processNext())
}

async function processNext(): Promise<void> {
  if (queue.size === 0) {
    _processing = false
    broadcast(getStatus())
    return
  }

  _processing = true
  const [id] = queue  // get first item
  queue.delete(id)

  try {
    const thought = dbGetThought(id)
    if (thought) {
      const text = stripHtml(`${thought.title} ${thought.notes}`)
      if (text.trim()) {
        const vec = await embed(text)
        dbUpsertEmbedding(id, vec)
      }
    }
  } catch (err) {
    console.error('[embeddings] failed to embed thought', id, err)
  }

  broadcast(getStatus())
  await delay(20) // yield the event loop briefly
  scheduleNext()
}

export function startBackgroundIndexer(win: BrowserWindow): void {
  _win = win

  // Give the renderer a moment to mount before first progress event
  setTimeout(async () => {
    // Enqueue all thoughts that don't yet have embeddings
    const missing = dbGetUnindexedThoughts()
    for (const id of missing) queue.add(id)

    if (queue.size > 0) {
      broadcast(getStatus())
      scheduleNext()
    }
  }, 1500)
}

// ── Public search API (called by IPC handler) ─────────────────────────────────

export async function semanticSearch(query: string, topK = 10): Promise<ThoughtWithScore[]> {
  const queryVec = await embed(stripHtml(query))
  return dbSemanticSearch(queryVec, topK)
}

export { getStatus, dbGetAllEmbeddings }
