import type { Thought } from '../../../shared/types'

interface PinsBarProps {
  pinnedThoughts: Thought[]
  activeId: string | null
  onNavigate: (id: string) => void
  onUnpin: (id: string) => void
}

export function PinsBar({ pinnedThoughts, activeId, onNavigate, onUnpin }: PinsBarProps) {
  if (pinnedThoughts.length === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 16px', flexShrink: 0, flexWrap: 'wrap',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)'
    }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0, userSelect: 'none' }}>📌</span>
      {pinnedThoughts.map(t => (
        <div
          key={t.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: activeId === t.id ? 'rgba(74,144,226,0.25)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${activeId === t.id ? 'rgba(74,144,226,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, padding: '3px 8px 3px 7px',
            fontSize: 12, cursor: 'pointer', userSelect: 'none',
            maxWidth: 160, overflow: 'hidden'
          }}
        >
          <span
            style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden', minWidth: 0 }}
            onClick={() => onNavigate(t.id)}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
            <span style={{ color: '#c8d8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.title}
            </span>
          </span>
          <span
            onClick={(e) => { e.stopPropagation(); onUnpin(t.id) }}
            title="Unpin"
            style={{
              fontSize: 11, color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
              flexShrink: 0, lineHeight: 1, paddingLeft: 2
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            ×
          </span>
        </div>
      ))}
    </div>
  )
}
