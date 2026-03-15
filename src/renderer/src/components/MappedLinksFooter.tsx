import type { Neighborhood } from '../../../shared/types'

interface Props {
  neighborhood: Neighborhood
  onNavigate: (id: string) => void
}

export function MappedLinksFooter({ neighborhood, onNavigate }: Props) {
  const { parents, children, jumps, siblings } = neighborhood

  const groups = [
    { key: 'parents',  label: 'Parents',  items: parents,  color: 'rgba(232,237,245,0.7)' },
    { key: 'children', label: 'Children', items: children, color: 'rgba(232,237,245,0.7)' },
    { key: 'jumps',    label: 'Jumps',    items: jumps,    color: '#f0a500' },
    { key: 'siblings', label: 'Siblings', items: siblings, color: '#4ae2d8' },
  ].filter(g => g.items.length > 0)

  if (groups.length === 0) return null

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '6px 10px 8px', background: 'rgba(0,0,0,0.08)' }}>
      {groups.map(group => (
        <div key={group.key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, marginBottom: 4 }}>
          <span style={{
            fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 600,
            letterSpacing: '0.07em', textTransform: 'uppercase', marginRight: 2, flexShrink: 0
          }}>
            {group.label}
          </span>
          {group.items.map(t => (
            <span
              key={t.id}
              onClick={() => onNavigate(t.id)}
              title={t.title}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '2px 7px',
                fontSize: 11, color: group.color, border: '1px solid rgba(255,255,255,0.08)',
                transition: 'background 0.12s', maxWidth: 140,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
