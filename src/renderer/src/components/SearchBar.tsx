import { useState, useRef, useCallback } from 'react'
import type { Thought } from '../../../shared/types'
import type { NewThoughtLinkAs } from './NewThoughtModal'

interface SearchBarProps {
  onNavigate: (id: string) => void
  onCreateThought?: (title: string, linkAs: NewThoughtLinkAs) => void
  inputRef?: React.RefObject<HTMLInputElement>
}

export function SearchBar({ onNavigate, onCreateThought, inputRef }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Thought[]>([])
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const localRef = useRef<HTMLInputElement>(null)
  const ref = (inputRef ?? localRef) as React.RefObject<HTMLInputElement>
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const res = await window.brain.searchThoughts(q)
      setResults(res); setOpen(res.length > 0); setIdx(0)
    }, 200)
  }, [])

  const clear = () => { setQuery(''); setOpen(false); setResults([]) }

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
      <input
        ref={ref}
        value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value) }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && open) { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)); return }
          if (e.key === 'ArrowUp' && open) { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); return }
          if (e.key === 'Escape') { setOpen(false); return }
          if (e.key === 'Enter') {
            e.preventDefault()
            const hasModifier = e.shiftKey || e.ctrlKey
            if (!hasModifier && results[idx] && open) {
              // Plain Enter on a result → navigate
              onNavigate(results[idx].id); clear()
            } else if (onCreateThought && query.trim()) {
              // Modifier keys → create a new thought
              if (e.ctrlKey && e.shiftKey) { onCreateThought(query.trim(), 'orphan'); clear() }
              else if (e.shiftKey) { onCreateThought(query.trim(), 'parent'); clear() }
              else if (e.ctrlKey) { onCreateThought(query.trim(), 'jump'); clear() }
              else if (!open) { onCreateThought(query.trim(), 'child'); clear() }
            }
          }
        }}
        onFocus={() => query && setOpen(results.length > 0)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search thoughts… (⌘F)"
        style={{
          width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '7px 12px', color: '#e8edf5', fontSize: 13, outline: 'none', boxSizing: 'border-box'
        }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e2a3a',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, marginTop: 4, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {results.map((t, i) => (
              <div key={t.id} onMouseDown={() => { onNavigate(t.id); clear() }}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                  color: i === idx ? '#fff' : '#b0c4de',
                  background: i === idx ? 'rgba(74,144,226,0.25)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                {t.title}
              </div>
            ))}
          </div>
          {onCreateThought && (
            <div style={{ padding: '5px 14px 6px', fontSize: 10, color: 'rgba(255,255,255,0.28)', borderTop: '1px solid rgba(255,255,255,0.08)', userSelect: 'none' }}>
              ⇧Enter parent &nbsp;·&nbsp; ⌃Enter jump &nbsp;·&nbsp; ⌃⇧Enter orphan
            </div>
          )}
        </div>
      )}
    </div>
  )
}
