import { useState, useRef, useEffect } from 'react'

export function NewThoughtModal({ onConfirm, onCancel }: { onConfirm: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const submit = () => { if (title.trim()) onConfirm(title.trim()) }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#1e2a3a', borderRadius: 12, padding: 24, width: 360, border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#e8edf5', marginBottom: 16 }}>New Thought</div>
        <input ref={ref} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
          placeholder="Thought title…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '10px 12px', color: '#e8edf5', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={submit} disabled={!title.trim()} style={{ background: title.trim() ? 'rgba(74,144,226,0.85)' : 'rgba(74,144,226,0.3)', border: 'none', color: '#fff', borderRadius: 6, padding: '7px 20px', cursor: title.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>Create</button>
        </div>
      </div>
    </div>
  )
}
