import { useState, useRef, useCallback } from 'react'
import type { Thought, ThoughtWithScore, IndexStatus } from '../../../shared/types'
import type { NewThoughtLinkAs } from './NewThoughtModal'

type SearchMode = 'fts' | 'semantic'

interface SearchBarProps {
  onNavigate: (id: string) => void
  onCreateThought?: (title: string, linkAs: NewThoughtLinkAs) => void
  onSemanticSearch: (query: string) => Promise<ThoughtWithScore[]>
  indexStatus: IndexStatus
  inputRef?: React.RefObject<HTMLInputElement>
}

export function SearchBar({ onNavigate, onCreateThought, onSemanticSearch, indexStatus, inputRef }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('fts')
  const [results, setResults] = useState<(Thought | ThoughtWithScore)[]>([])
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const [searching, setSearching] = useState(false)
  const localRef = useRef<HTMLInputElement>(null)
  const ref = (inputRef ?? localRef) as React.RefObject<HTMLInputElement>
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string, m: SearchMode) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    if (timer.current) clearTimeout(timer.current)
    const debounce = m === 'semantic' ? 400 : 200
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        if (m === 'semantic') {
          const res = await onSemanticSearch(q)
          setResults(res); setOpen(res.length > 0); setIdx(0)
        } else {
          const res = await window.brain.searchThoughts(q)
          setResults(res); setOpen(res.length > 0); setIdx(0)
        }
      } finally {
        setSearching(false)
      }
    }, debounce)
  }, [onSemanticSearch])

  const toggleMode = () => {
    const next: SearchMode = mode === 'fts' ? 'semantic' : 'fts'
    setMode(next)
    if (query.trim()) search(query, next)
  }

  const clear = () => { setQuery(''); setOpen(false); setResults([]) }

  const isIndexReady = indexStatus.indexed > 0 && !indexStatus.loading

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 420, display: 'flex', gap: 6, alignItems: 'center' }}>
      {/* Mode toggle */}
      <button
        onClick={toggleMode}
        title={mode === 'fts' ? 'Switch to semantic search' : 'Switch to keyword search'}
        style={{
          background: mode === 'semantic' ? 'rgba(123,104,238,0.35)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${mode === 'semantic' ? 'rgba(123,104,238,0.6)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 6, padding: '5px 8px', color: mode === 'semantic' ? '#b8a8ff' : 'rgba(255,255,255,0.45)',
          cursor: 'pointer', fontSize: 13, flexShrink: 0, lineHeight: 1
        }}>
        {mode === 'semantic' ? '⚡' : '≡'}
      </button>

      {/* Input */}
      <div style={{ position: 'relative', flex: 1 }}>
        <input
          ref={ref}
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value, mode) }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' && open) { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)); return }
            if (e.key === 'ArrowUp' && open) { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); return }
            if (e.key === 'Escape') { setOpen(false); return }
            if (e.key === 'Enter') {
              e.preventDefault()
              const hasModifier = e.shiftKey || e.ctrlKey
              if (!hasModifier && results[idx] && open) {
                onNavigate(results[idx].id); clear()
              } else if (onCreateThought && query.trim()) {
                if (e.ctrlKey && e.shiftKey) { onCreateThought(query.trim(), 'orphan'); clear() }
                else if (e.shiftKey) { onCreateThought(query.trim(), 'parent'); clear() }
                else if (e.ctrlKey) { onCreateThought(query.trim(), 'jump'); clear() }
                else if (!open) { onCreateThought(query.trim(), 'child'); clear() }
              }
            }
          }}
          onFocus={() => query && setOpen(results.length > 0)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={mode === 'semantic' ? 'Search by meaning… (⌘F)' : 'Search thoughts… (⌘F)'}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.08)',
            border: `1px solid ${mode === 'semantic' ? 'rgba(123,104,238,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 8, padding: '7px 12px', color: '#e8edf5', fontSize: 13,
            outline: 'none', boxSizing: 'border-box'
          }}
        />

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e2a3a',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, marginTop: 4,
            zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
            {/* Model loading notice */}
            {mode === 'semantic' && !isIndexReady && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                {indexStatus.indexed === 0 ? 'Loading model & indexing…' : `Indexing ${indexStatus.indexed}/${indexStatus.total}…`}
              </div>
            )}

            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {results.map((t, i) => {
                const score = (t as ThoughtWithScore).score
                return (
                  <div key={t.id} onMouseDown={() => { onNavigate(t.id); clear() }}
                    style={{
                      padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                      color: i === idx ? '#fff' : '#b0c4de',
                      background: i === idx ? 'rgba(74,144,226,0.25)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 8
                    }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    {score !== undefined && (
                      <span style={{ fontSize: 10, color: score > 70 ? '#7B68EE' : 'rgba(255,255,255,0.3)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {score}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Hints footer */}
            {onCreateThought && (
              <div style={{ padding: '5px 14px 6px', fontSize: 10, color: 'rgba(255,255,255,0.28)', borderTop: '1px solid rgba(255,255,255,0.08)', userSelect: 'none' }}>
                ⇧Enter parent &nbsp;·&nbsp; ⌃Enter jump &nbsp;·&nbsp; ⌃⇧Enter orphan
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline spinner while searching */}
      {searching && (
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>⟳</span>
      )}
    </div>
  )
}
