import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Thought, Link, Attachment, Neighborhood, Tag, ThoughtType, LinkType, ThoughtWithScore } from '../shared/types'

let db: Database.Database

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'brain.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createSchema()
  runMigrations()
}

function createSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS thoughts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT DEFAULT '',
      color TEXT DEFAULT '#4A90E2',
      type_id TEXT DEFAULT NULL,
      is_pinned INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'child',
      label TEXT DEFAULT '',
      is_one_way INTEGER DEFAULT 0,
      color TEXT DEFAULT '',
      width REAL DEFAULT 0,
      link_type_id TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(source_id) REFERENCES thoughts(id) ON DELETE CASCADE,
      FOREIGN KEY(target_id) REFERENCES thoughts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      thought_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(thought_id) REFERENCES thoughts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#888888',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS thought_tags (
      thought_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY(thought_id, tag_id),
      FOREIGN KEY(thought_id) REFERENCES thoughts(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS thought_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#4A90E2',
      icon TEXT DEFAULT '',
      super_type_id TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS link_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#5a7fa0',
      width REAL DEFAULT 1.5,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS thought_embeddings (
      thought_id TEXT PRIMARY KEY REFERENCES thoughts(id) ON DELETE CASCADE,
      embedding  BLOB    NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS thoughts_fts USING fts5(
      title, notes, content=thoughts, content_rowid=rowid
    );

    CREATE TRIGGER IF NOT EXISTS thoughts_ai AFTER INSERT ON thoughts BEGIN
      INSERT INTO thoughts_fts(rowid, title, notes) VALUES (new.rowid, new.title, new.notes);
    END;
    CREATE TRIGGER IF NOT EXISTS thoughts_ad AFTER DELETE ON thoughts BEGIN
      INSERT INTO thoughts_fts(thoughts_fts, rowid, title, notes) VALUES('delete', old.rowid, old.title, old.notes);
    END;
    CREATE TRIGGER IF NOT EXISTS thoughts_au AFTER UPDATE ON thoughts BEGIN
      INSERT INTO thoughts_fts(thoughts_fts, rowid, title, notes) VALUES('delete', old.rowid, old.title, old.notes);
      INSERT INTO thoughts_fts(rowid, title, notes) VALUES (new.rowid, new.title, new.notes);
    END;
  `)
}

function runMigrations(): void {
  const cols = (table: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(r => r.name)
  // v1.1
  if (!cols('thoughts').includes('type_id'))          db.exec(`ALTER TABLE thoughts ADD COLUMN type_id TEXT DEFAULT NULL`)
  if (!cols('links').includes('label'))               db.exec(`ALTER TABLE links ADD COLUMN label TEXT DEFAULT ''`)
  if (!cols('links').includes('is_one_way'))          db.exec(`ALTER TABLE links ADD COLUMN is_one_way INTEGER DEFAULT 0`)
  // v1.3
  if (!cols('thoughts').includes('is_pinned'))        db.exec(`ALTER TABLE thoughts ADD COLUMN is_pinned INTEGER DEFAULT 0`)
  if (!cols('thought_types').includes('icon'))        db.exec(`ALTER TABLE thought_types ADD COLUMN icon TEXT DEFAULT ''`)
  if (!cols('links').includes('color'))               db.exec(`ALTER TABLE links ADD COLUMN color TEXT DEFAULT ''`)
  if (!cols('links').includes('width'))               db.exec(`ALTER TABLE links ADD COLUMN width REAL DEFAULT 0`)
  if (!cols('links').includes('link_type_id'))        db.exec(`ALTER TABLE links ADD COLUMN link_type_id TEXT DEFAULT NULL`)
}

// ── Thoughts ──────────────────────────────────────────────────────────────────

export function dbCreateThought(title: string, color?: string): Thought {
  const now = Date.now()
  const t: Thought = { id: uuidv4(), title, notes: '', color: color ?? '#4A90E2', type_id: null, is_pinned: 0, created_at: now, updated_at: now }
  db.prepare('INSERT INTO thoughts (id,title,notes,color,type_id,is_pinned,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(t.id, t.title, t.notes, t.color, t.type_id, t.is_pinned, t.created_at, t.updated_at)
  return t
}

export function dbGetThought(id: string): Thought | undefined {
  return db.prepare('SELECT * FROM thoughts WHERE id = ?').get(id) as Thought | undefined
}

export function dbUpdateThought(id: string, patch: Partial<Omit<Thought, 'id' | 'created_at'>>): void {
  const fields = Object.entries(patch).map(([k]) => `${k} = ?`).join(', ')
  db.prepare(`UPDATE thoughts SET ${fields}, updated_at = ? WHERE id = ?`).run(...Object.values(patch), Date.now(), id)
}

export function dbDeleteThought(id: string): void {
  db.prepare('DELETE FROM thoughts WHERE id = ?').run(id)
}

export function dbGetAllThoughts(): Thought[] {
  return db.prepare('SELECT * FROM thoughts ORDER BY updated_at DESC').all() as Thought[]
}

export function dbSearchThoughts(query: string): Thought[] {
  const esc = query.replace(/['"*]/g, ' ')
  return db.prepare(
    `SELECT t.* FROM thoughts t JOIN thoughts_fts fts ON t.rowid = fts.rowid WHERE thoughts_fts MATCH ? ORDER BY rank`
  ).all(esc + '*') as Thought[]
}

export function dbTogglePin(id: string): Thought {
  const t = dbGetThought(id)
  if (!t) throw new Error(`Thought ${id} not found`)
  const newPin = t.is_pinned ? 0 : 1
  db.prepare('UPDATE thoughts SET is_pinned = ?, updated_at = ? WHERE id = ?').run(newPin, Date.now(), id)
  return { ...t, is_pinned: newPin }
}

export function dbGetPinnedThoughts(): Thought[] {
  return db.prepare('SELECT * FROM thoughts WHERE is_pinned = 1 ORDER BY updated_at DESC').all() as Thought[]
}

// ── Neighborhood ──────────────────────────────────────────────────────────────

export function dbGetNeighborhood(id: string): Neighborhood {
  const thought = dbGetThought(id)
  if (!thought) throw new Error(`Thought ${id} not found`)

  const parents = db.prepare(
    `SELECT t.* FROM thoughts t JOIN links l ON l.source_id = t.id WHERE l.target_id = ? AND l.type = 'child'`
  ).all(id) as Thought[]

  const children = db.prepare(
    `SELECT t.* FROM thoughts t JOIN links l ON l.target_id = t.id WHERE l.source_id = ? AND l.type = 'child'`
  ).all(id) as Thought[]

  // Jumps: respect one-way — only show if bidirectional OR we are the source
  const jumps = db.prepare(
    `SELECT DISTINCT t.* FROM thoughts t
     JOIN links l ON (
       (l.source_id = t.id AND l.target_id = ?) OR
       (l.target_id = t.id AND l.source_id = ? AND l.is_one_way = 0)
     )
     WHERE l.type = 'jump' AND t.id != ?`
  ).all(id, id, id) as Thought[]

  // Siblings: share at least one parent with this thought
  const siblings = db.prepare(
    `SELECT DISTINCT t.* FROM thoughts t
     JOIN links l1 ON l1.target_id = t.id AND l1.type = 'child'
     JOIN links l2 ON l2.target_id = ? AND l2.type = 'child' AND l2.source_id = l1.source_id
     WHERE t.id != ?`
  ).all(id, id) as Thought[]

  const links = db.prepare(
    `SELECT l.* FROM links l
     WHERE l.source_id = ?
        OR (l.target_id = ? AND (l.is_one_way = 0 OR l.type = 'child'))`
  ).all(id, id) as Link[]

  const attachments = db.prepare(
    'SELECT * FROM attachments WHERE thought_id = ? ORDER BY created_at DESC'
  ).all(id) as Attachment[]

  const tags = db.prepare(
    `SELECT tg.* FROM tags tg JOIN thought_tags tt ON tt.tag_id = tg.id WHERE tt.thought_id = ?`
  ).all(id) as Tag[]

  // Backlinks: other thoughts whose notes mention this thought's title
  const backlinks = thought.title.trim().length > 2
    ? (db.prepare(
        `SELECT * FROM thoughts WHERE id != ? AND instr(lower(notes), lower(?)) > 0 ORDER BY updated_at DESC LIMIT 15`
      ).all(id, thought.title) as Thought[])
    : []

  return { thought, parents, children, jumps, siblings, links, attachments, tags, backlinks }
}

// ── Links ─────────────────────────────────────────────────────────────────────

export function dbCreateLink(
  sourceId: string, targetId: string, type: 'child' | 'jump',
  label = '', isOneWay = 0, color = '', width = 0, linkTypeId: string | null = null
): Link {
  const link: Link = {
    id: uuidv4(), source_id: sourceId, target_id: targetId, type,
    label, is_one_way: isOneWay, color, width, link_type_id: linkTypeId, created_at: Date.now()
  }
  db.prepare('INSERT INTO links (id,source_id,target_id,type,label,is_one_way,color,width,link_type_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(link.id, link.source_id, link.target_id, link.type, link.label, link.is_one_way, link.color, link.width, link.link_type_id, link.created_at)
  return link
}

export function dbUpdateLink(id: string, patch: { label?: string; is_one_way?: number; color?: string; width?: number; link_type_id?: string | null }): void {
  const fields = Object.entries(patch).map(([k]) => `${k} = ?`).join(', ')
  db.prepare(`UPDATE links SET ${fields} WHERE id = ?`).run(...Object.values(patch), id)
}

export function dbDeleteLink(id: string): void {
  db.prepare('DELETE FROM links WHERE id = ?').run(id)
}

export function dbGetAllLinks(): Link[] {
  return db.prepare('SELECT * FROM links').all() as Link[]
}

// ── Attachments ───────────────────────────────────────────────────────────────

export function dbAddAttachment(thoughtId: string, type: 'file' | 'url', name: string, filePath: string): Attachment {
  const a: Attachment = { id: uuidv4(), thought_id: thoughtId, type, name, path: filePath, created_at: Date.now() }
  db.prepare('INSERT INTO attachments (id,thought_id,type,name,path,created_at) VALUES (?,?,?,?,?,?)')
    .run(a.id, a.thought_id, a.type, a.name, a.path, a.created_at)
  return a
}

export function dbDeleteAttachment(id: string): void {
  db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export function dbCreateTag(name: string, color: string): Tag {
  const tag: Tag = { id: uuidv4(), name, color, created_at: Date.now() }
  db.prepare('INSERT INTO tags (id,name,color,created_at) VALUES (?,?,?,?)').run(tag.id, tag.name, tag.color, tag.created_at)
  return tag
}

export function dbGetAllTags(): Tag[] {
  return db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[]
}

export function dbAddTagToThought(thoughtId: string, tagId: string): void {
  db.prepare('INSERT OR IGNORE INTO thought_tags (thought_id,tag_id) VALUES (?,?)').run(thoughtId, tagId)
}

export function dbRemoveTagFromThought(thoughtId: string, tagId: string): void {
  db.prepare('DELETE FROM thought_tags WHERE thought_id = ? AND tag_id = ?').run(thoughtId, tagId)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export function dbCreateType(name: string, color: string, icon = ''): ThoughtType {
  const t: ThoughtType = { id: uuidv4(), name, color, icon, super_type_id: null, created_at: Date.now() }
  db.prepare('INSERT INTO thought_types (id,name,color,icon,super_type_id,created_at) VALUES (?,?,?,?,?,?)').run(t.id, t.name, t.color, t.icon, t.super_type_id, t.created_at)
  return t
}

export function dbGetAllTypes(): ThoughtType[] {
  return db.prepare('SELECT * FROM thought_types ORDER BY name').all() as ThoughtType[]
}

// ── Link Types ────────────────────────────────────────────────────────────────

export function dbCreateLinkType(name: string, color: string, width: number): LinkType {
  const lt: LinkType = { id: uuidv4(), name, color, width, created_at: Date.now() }
  db.prepare('INSERT INTO link_types (id,name,color,width,created_at) VALUES (?,?,?,?,?)').run(lt.id, lt.name, lt.color, lt.width, lt.created_at)
  return lt
}

export function dbGetAllLinkTypes(): LinkType[] {
  return db.prepare('SELECT * FROM link_types ORDER BY name').all() as LinkType[]
}

export function dbDeleteLinkType(id: string): void {
  db.prepare('DELETE FROM link_types WHERE id = ?').run(id)
}

// ── Embeddings ─────────────────────────────────────────────────────────────────

export function dbUpsertEmbedding(thoughtId: string, embedding: Float32Array): void {
  const buf = Buffer.from(embedding.buffer)
  db.prepare('INSERT OR REPLACE INTO thought_embeddings (thought_id, embedding, updated_at) VALUES (?,?,?)')
    .run(thoughtId, buf, Date.now())
}

export function dbGetAllEmbeddings(): { thoughtId: string; embedding: Float32Array }[] {
  const rows = db.prepare('SELECT thought_id, embedding FROM thought_embeddings').all() as { thought_id: string; embedding: Buffer }[]
  return rows.map(r => ({
    thoughtId: r.thought_id,
    embedding: new Float32Array(r.embedding.buffer, r.embedding.byteOffset, r.embedding.byteLength / 4)
  }))
}

export function dbGetUnindexedThoughts(): string[] {
  const rows = db.prepare(
    `SELECT id FROM thoughts WHERE id NOT IN (SELECT thought_id FROM thought_embeddings)`
  ).all() as { id: string }[]
  return rows.map(r => r.id)
}

export function dbGetIndexStatus(): { indexed: number; total: number } {
  const total = (db.prepare('SELECT COUNT(*) as n FROM thoughts').get() as { n: number }).n
  const indexed = (db.prepare('SELECT COUNT(*) as n FROM thought_embeddings').get() as { n: number }).n
  return { indexed, total }
}

export function dbSemanticSearch(queryVec: Float32Array, topK = 10): ThoughtWithScore[] {
  const all = dbGetAllEmbeddings()
  if (all.length === 0) return []

  const scored = all.map(({ thoughtId, embedding }) => ({
    thoughtId,
    score: cosineSimilarity(queryVec, embedding)
  }))
  scored.sort((a, b) => b.score - a.score)

  const top = scored.slice(0, topK)
  const results: ThoughtWithScore[] = []
  for (const { thoughtId, score } of top) {
    const t = dbGetThought(thoughtId)
    if (t) results.push({ ...t, score: Math.round(score * 100) })
  }
  return results
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, magA = 0, magB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

// ── Settings ───────────────────────────────────────────────────────────────────

export function dbGetSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function dbSetSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}
