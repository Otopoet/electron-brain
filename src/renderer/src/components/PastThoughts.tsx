import { useState } from 'react'
import type { Thought } from '../../../shared/types'

interface PastThoughtsProps {
  history: string[]
  allThoughts: Thought[]
  activeId: string | null
  onNavigate: (id: string) => void
}

export function PastThoughts({ history, allThoughts, activeId, onNavigate }: PastThoughtsProps) {
  const [expanded, setExpanded] = useState(false)

  // Resolve IDs to thought objects; skip the currently active one
  const items = history
    .filter(id => id !== activeId)
    .map(id => allThoughts.find(t => t.id === id))
    .filter((t): t is Thought => !!t)
    .slice(0, 20)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      width: expanded ? 180 : 24,
      borderRight: '1px solid rgba(255,255,255,0.07)',
      background: '#0d1117',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(e => !e)}
        title={expanded ? 'Collapse history' : 'Expand history'}
        style={{
          position: 'absolute', top: 8, right: 0,
          width: 24, height: 24, border: 'none',
          background: 'transparent', color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, zIndex: 1,
          transition: 'color 0.15s'
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
      >
        {expanded ? '◂' : '▸'}
      </button>

      {/* Items — only rendered when expanded */}
      {expanded && (
        <div style={{ paddingTop: 36, overflowY: 'auto', flex: 1 }}>
          {items.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: 11, color: 'rgba(255,255,255,0.25)', userSelect: 'none' }}>
              No history yet
            </div>
          ) : (
            items.map(t => (
              <div
                key={t.id}
                onClick={() => onNavigate(t.id)}
                title={t.title}
                style={{
                  padding: '6px 10px', cursor: 'pointer', fontSize: 12,
                  color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap', overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#e8edf5'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
