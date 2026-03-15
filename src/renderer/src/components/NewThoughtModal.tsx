import { useState, useRef, useEffect } from 'react'

export type NewThoughtLinkAs = 'child' | 'parent' | 'jump' | 'orphan'

export function NewThoughtModal({
  onConfirm,
  onCancel,
  defaultLinkAs = 'child'
}: {
  onConfirm: (title: string, linkAs: NewThoughtLinkAs) => void
  onCancel: () => void
  defaultLinkAs?: NewThoughtLinkAs
}) {
  const [title, setTitle] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const submit = (linkAs: NewThoughtLinkAs = defaultLinkAs) => {
    if (title.trim()) onConfirm(title.trim(), linkAs)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div style={{ background: '#1e2a3a', borderRadius: 12, padding: 24, width: 400, border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#e8edf5', marginBottom: 14 }}>New Thought</div>

        <input
          ref={ref}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') { onCancel(); return }
            if (e.key === 'Enter') {
              e.preventDefault()
              if (e.ctrlKey && e.shiftKey) submit('orphan')
              else if (e.shiftKey) submit('parent')
              else if (e.ctrlKey) submit('jump')
              else submit('child')
            }
          }}
          placeholder="Thought title… (use ; for batch)"
          style={{
            width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 8, padding: '10px 12px', color: '#e8edf5', fontSize: 15, outline: 'none',
            boxSizing: 'border-box', marginBottom: 10
          }}
        />

        {/* Shortcut hints */}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 16, lineHeight: 1.7, userSelect: 'none' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>Enter</span> = child &nbsp;·&nbsp;
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>⇧Enter</span> = parent &nbsp;·&nbsp;
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>⌃Enter</span> = jump &nbsp;·&nbsp;
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>⌃⇧Enter</span> = orphan
          <br />
          Prefix with <span style={{ color: 'rgba(255,255,255,0.45)' }}>,</span> or suffix with <span style={{ color: 'rgba(255,255,255,0.45)' }}>,</span> to include parent name
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={() => submit('child')} disabled={!title.trim()}
            style={{ background: title.trim() ? 'rgba(74,144,226,0.85)' : 'rgba(74,144,226,0.3)', border: 'none', color: '#fff', borderRadius: 6, padding: '7px 20px', cursor: title.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
