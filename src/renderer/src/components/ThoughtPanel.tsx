import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Neighborhood, Attachment, Thought } from '../../../shared/types'
import { FilePreview } from './FilePreview'

interface Props {
  neighborhood: Neighborhood | null
  onUpdate: (id: string, patch: { title?: string; notes?: string; color?: string }) => void
  onDeleteThought: (id: string) => void
  onAddAttachment: (type: 'file' | 'url', name: string, path: string) => void
  onDeleteAttachment: (id: string) => void
  onPickFile: () => void
  onCreateLink: (sourceId: string, targetId: string, type: 'child' | 'jump') => void
  allThoughts: Thought[]
  activeId: string | null
}

const COLORS = ['#4A90E2','#7B68EE','#E24A4A','#4AE28A','#E2B94A','#E24AB5','#4AE2D8','#9E9E9E']
const btn: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }
const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '5px 8px', color: '#e8edf5', fontSize: 12, outline: 'none', width: '100%' }

export function ThoughtPanel({ neighborhood, onUpdate, onDeleteThought, onAddAttachment, onDeleteAttachment, onPickFile, onCreateLink, allThoughts, activeId }: Props) {
  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [linkTarget, setLinkTarget] = useState('')
  const [linkType, setLinkType] = useState<'child'|'jump'>('child')
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: { attributes: { class: 'tiptap-editor' } },
    onUpdate: ({ editor }) => {
      if (!neighborhood) return
      const html = editor.getHTML()
      if (notesTimer.current) clearTimeout(notesTimer.current)
      notesTimer.current = setTimeout(() => onUpdate(neighborhood.thought.id, { notes: html }), 600)
    }
  })

  useEffect(() => {
    if (!neighborhood) return
    setTitle(neighborhood.thought.title)
    setEditingTitle(false)
    setPreviewAtt(null)
    if (editor && editor.getHTML() !== neighborhood.thought.notes) {
      editor.commands.setContent(neighborhood.thought.notes || '', false)
    }
  }, [neighborhood?.thought.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveTitle = useCallback(() => {
    setEditingTitle(false)
    if (neighborhood && title.trim() && title !== neighborhood.thought.title) {
      onUpdate(neighborhood.thought.id, { title: title.trim() })
    }
  }, [neighborhood, title, onUpdate])

  const addUrl = useCallback(() => {
    if (!urlInput.trim()) return
    onAddAttachment('url', urlName.trim() || urlInput, urlInput)
    setUrlInput(''); setUrlName(''); setShowUrl(false)
  }, [urlInput, urlName, onAddAttachment])

  const linkThought = useCallback(() => {
    if (!linkTarget || !activeId) return
    onCreateLink(activeId, linkTarget, linkType)
    setLinkTarget(''); setShowLink(false)
  }, [linkTarget, linkType, activeId, onCreateLink])

  if (!neighborhood) return (
    <div style={{ width: 320, borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
      Select a thought
    </div>
  )

  const { thought, attachments } = neighborhood
  return (
    <div style={{ width: 320, minWidth: 280, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#141c26', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {COLORS.map(c => <div key={c} onClick={() => onUpdate(thought.id, { color: c })} style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: thought.color === c ? '2px solid #fff' : '2px solid transparent' }} />)}
        </div>
        {editingTitle ? (
          <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle} onKeyDown={e => { if (e.key === 'Enter') titleRef.current?.blur(); if (e.key === 'Escape') { setTitle(thought.title); setEditingTitle(false) } }}
            autoFocus style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(74,144,226,0.6)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 16, fontWeight: 600, outline: 'none' }} />
        ) : (
          <div onClick={() => setEditingTitle(true)} style={{ fontSize: 16, fontWeight: 600, color: '#e8edf5', cursor: 'text', padding: '4px 0', lineHeight: 1.3, wordBreak: 'break-word' }}>{thought.title}</div>
        )}
        <button onClick={() => { if (window.confirm(`Delete "${thought.title}"?`)) onDeleteThought(thought.id) }}
          style={{ marginTop: 8, background: 'none', border: '1px solid rgba(226,74,74,0.35)', color: 'rgba(226,74,74,0.7)', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
          Delete thought
        </button>
      </div>

      {/* Notes */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', flexShrink: 0 }}>Notes</div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 10px 10px' }}><EditorContent editor={editor} /></div>
      </div>

      {/* Attachments */}
      <div style={{ flexShrink: 0, maxHeight: 340, overflowY: 'auto' }}>
        <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Attachments</div>
        {attachments.map(att => (
          <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 16px', borderRadius: 4, margin: '2px 8px', background: previewAtt?.id === att.id ? 'rgba(74,144,226,0.15)' : 'transparent' }}>
            <span style={{ fontSize: 13 }}>{att.type === 'url' ? '🔗' : '📎'}</span>
            <span onClick={() => setPreviewAtt(previewAtt?.id === att.id ? null : att)} style={{ flex: 1, fontSize: 12, color: '#a8c8f0', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={att.path}>{att.name}</span>
            <button onClick={() => window.brain.openFile(att.path)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }} title="Open">↗</button>
            <button onClick={() => { onDeleteAttachment(att.id); if (previewAtt?.id === att.id) setPreviewAtt(null) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}>×</button>
          </div>
        ))}
        {previewAtt?.type === 'file' && <FilePreview filePath={previewAtt.path} />}

        <div style={{ display: 'flex', gap: 6, padding: '6px 16px 4px', flexWrap: 'wrap' }}>
          <button onClick={onPickFile} style={btn}>+ File</button>
          <button onClick={() => setShowUrl(!showUrl)} style={btn}>+ URL</button>
          <button onClick={() => setShowLink(!showLink)} style={btn}>+ Link thought</button>
        </div>

        {showUrl && (
          <div style={{ padding: '4px 16px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input placeholder="URL (https://…)" value={urlInput} onChange={e => setUrlInput(e.target.value)} style={inp} />
            <input placeholder="Label (optional)" value={urlName} onChange={e => setUrlName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUrl()} style={inp} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={addUrl} style={{ ...btn, background: 'rgba(74,144,226,0.3)' }}>Add</button>
              <button onClick={() => setShowUrl(false)} style={btn}>Cancel</button>
            </div>
          </div>
        )}

        {showLink && (
          <div style={{ padding: '4px 16px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <select value={linkTarget} onChange={e => setLinkTarget(e.target.value)} style={inp}>
              <option value="">Select thought…</option>
              {allThoughts.filter(t => t.id !== activeId).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <select value={linkType} onChange={e => setLinkType(e.target.value as 'child'|'jump')} style={inp}>
              <option value="child">Child</option>
              <option value="jump">Jump</option>
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={linkThought} style={{ ...btn, background: 'rgba(74,144,226,0.3)' }}>Link</button>
              <button onClick={() => setShowLink(false)} style={btn}>Cancel</button>
            </div>
          </div>
        )}
        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
