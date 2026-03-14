import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Neighborhood, Attachment, Thought, Tag, ThoughtType } from '../../../shared/types'
import { FilePreview } from './FilePreview'

interface Props {
  neighborhood: Neighborhood | null
  onUpdate: (id: string, patch: Partial<Pick<Thought, 'title' | 'notes' | 'color' | 'type_id'>>) => void
  onDeleteThought: (id: string) => void
  onAddAttachment: (type: 'file' | 'url', name: string, path: string) => void
  onDeleteAttachment: (id: string) => void
  onPickFile: () => void
  onCreateLink: (sourceId: string, targetId: string, type: 'child' | 'jump') => void
  onAddTag: (tagId: string) => void
  onRemoveTag: (tagId: string) => void
  onCreateTag: (name: string, color: string) => Promise<Tag>
  onNavigate: (id: string) => void
  allThoughts: Thought[]
  allTags: Tag[]
  allTypes: ThoughtType[]
  activeId: string | null
}

const COLORS = ['#4A90E2','#7B68EE','#E24A4A','#4AE28A','#E2B94A','#E24AB5','#4AE2D8','#9E9E9E']
const TAG_PALETTE = ['#4A90E2','#7B68EE','#E24A4A','#4AE28A','#E2B94A','#E24AB5','#4AE2D8','#888']

const btn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.6)', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer'
}
const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4, padding: '5px 8px', color: '#e8edf5', fontSize: 12, outline: 'none', width: '100%'
}

export function ThoughtPanel({
  neighborhood, onUpdate, onDeleteThought, onAddAttachment, onDeleteAttachment,
  onPickFile, onCreateLink, onAddTag, onRemoveTag, onCreateTag, onNavigate,
  allThoughts, allTags, allTypes, activeId
}: Props) {
  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [linkTarget, setLinkTarget] = useState('')
  const [linkType, setLinkType] = useState<'child' | 'jump'>('child')
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0])
  const [showBacklinks, setShowBacklinks] = useState(true)
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
    setShowTagPicker(false)
    setShowNewTag(false)
    setNewTagName('')
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

  const handleCreateTag = useCallback(() => {
    if (!newTagName.trim()) return
    onCreateTag(newTagName.trim(), newTagColor).then(tag => {
      onAddTag(tag.id)
      setNewTagName(''); setShowNewTag(false); setShowTagPicker(false)
    })
  }, [newTagName, newTagColor, onCreateTag, onAddTag])

  if (!neighborhood) return (
    <div style={{ width: 320, borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
      Select a thought
    </div>
  )

  const { thought, attachments, tags, backlinks } = neighborhood
  const appliedTagIds = new Set((tags ?? []).map(t => t.id))
  const availableTags = allTags.filter(t => !appliedTagIds.has(t.id))

  return (
    <div style={{ width: 320, minWidth: 280, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#141c26', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>

        {/* Color swatches */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => onUpdate(thought.id, { color: c })}
              style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: thought.color === c ? '2px solid #fff' : '2px solid transparent' }} />
          ))}
        </div>

        {/* Type selector */}
        <div style={{ marginBottom: 8 }}>
          <select
            value={thought.type_id ?? ''}
            onChange={e => {
              const typeId = e.target.value || null
              const type = allTypes.find(t => t.id === typeId)
              onUpdate(thought.id, { type_id: typeId, ...(type ? { color: type.color } : {}) })
            }}
            style={{ ...inp, fontSize: 11, padding: '3px 6px' }}
          >
            <option value="">No type</option>
            {allTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        {editingTitle ? (
          <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') titleRef.current?.blur()
              if (e.key === 'Escape') { setTitle(thought.title); setEditingTitle(false) }
            }}
            autoFocus
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(74,144,226,0.6)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 16, fontWeight: 600, outline: 'none' }} />
        ) : (
          <div onClick={() => setEditingTitle(true)}
            style={{ fontSize: 16, fontWeight: 600, color: '#e8edf5', cursor: 'text', padding: '4px 0', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {thought.title}
          </div>
        )}

        {/* Tags row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, alignItems: 'center' }}>
          {(tags ?? []).map(tag => (
            <span key={tag.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: tag.color + '28', border: `1px solid ${tag.color}55`,
              borderRadius: 12, padding: '2px 7px 2px 8px', fontSize: 10, color: tag.color
            }}>
              {tag.name}
              <span onClick={() => onRemoveTag(tag.id)} style={{ cursor: 'pointer', opacity: 0.65, marginLeft: 2, lineHeight: 1, fontSize: 12 }}>×</span>
            </span>
          ))}
          <button onClick={() => { setShowTagPicker(!showTagPicker); setShowNewTag(false) }}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12, padding: '2px 8px', fontSize: 10, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
            + tag
          </button>
        </div>

        {/* Tag picker dropdown */}
        {showTagPicker && (
          <div style={{ marginTop: 6, background: 'rgba(0,0,0,0.35)', borderRadius: 6, padding: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
            {availableTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {availableTags.map(tag => (
                  <span key={tag.id} onClick={() => { onAddTag(tag.id); setShowTagPicker(false) }}
                    style={{ display: 'inline-flex', alignItems: 'center', background: tag.color + '28', border: `1px solid ${tag.color}55`, borderRadius: 12, padding: '2px 8px', fontSize: 10, color: tag.color, cursor: 'pointer' }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            {availableTags.length === 0 && !showNewTag && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>All tags applied</div>
            )}
            {!showNewTag ? (
              <button onClick={() => setShowNewTag(true)} style={{ ...btn, fontSize: 10, width: '100%' }}>+ Create new tag</button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input placeholder="Tag name…" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                  autoFocus style={{ ...inp, fontSize: 11 }} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {TAG_PALETTE.map(c => (
                    <div key={c} onClick={() => setNewTagColor(c)}
                      style={{ width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer', border: newTagColor === c ? '2px solid #fff' : '2px solid transparent' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={handleCreateTag} style={{ ...btn, background: 'rgba(74,144,226,0.3)', fontSize: 10 }}>Create</button>
                  <button onClick={() => { setShowNewTag(false); setNewTagName('') }} style={{ ...btn, fontSize: 10 }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete */}
        <button onClick={() => { if (window.confirm(`Delete "${thought.title}"?`)) onDeleteThought(thought.id) }}
          style={{ marginTop: 8, background: 'none', border: '1px solid rgba(226,74,74,0.35)', color: 'rgba(226,74,74,0.7)', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
          Delete thought
        </button>
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', flexShrink: 0 }}>Notes</div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 10px 10px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* ── Attachments ────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, maxHeight: 220, overflowY: 'auto' }}>
        <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Attachments</div>
        {attachments.map(att => (
          <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 16px', borderRadius: 4, margin: '2px 8px', background: previewAtt?.id === att.id ? 'rgba(74,144,226,0.15)' : 'transparent' }}>
            <span style={{ fontSize: 13 }}>{att.type === 'url' ? '🔗' : '📎'}</span>
            <span onClick={() => setPreviewAtt(previewAtt?.id === att.id ? null : att)}
              style={{ flex: 1, fontSize: 12, color: '#a8c8f0', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={att.path}>{att.name}</span>
            <button onClick={() => window.brain.openFile(att.path)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }} title="Open">↗</button>
            <button onClick={() => { onDeleteAttachment(att.id); if (previewAtt?.id === att.id) setPreviewAtt(null) }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}>×</button>
          </div>
        ))}
        {previewAtt?.type === 'file' && <FilePreview filePath={previewAtt.path} />}

        <div style={{ display: 'flex', gap: 6, padding: '6px 16px 4px', flexWrap: 'wrap' }}>
          <button onClick={onPickFile} style={btn}>+ File</button>
          <button onClick={() => setShowUrl(!showUrl)} style={btn}>+ URL</button>
          <button onClick={() => setShowLink(!showLink)} style={btn}>+ Link</button>
        </div>

        {showUrl && (
          <div style={{ padding: '4px 16px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input placeholder="URL (https://…)" value={urlInput} onChange={e => setUrlInput(e.target.value)} style={inp} />
            <input placeholder="Label (optional)" value={urlName} onChange={e => setUrlName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addUrl()} style={inp} />
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
              {allThoughts.filter(t => t.id !== activeId).map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <select value={linkType} onChange={e => setLinkType(e.target.value as 'child' | 'jump')} style={inp}>
              <option value="child">Child</option>
              <option value="jump">Jump</option>
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={linkThought} style={{ ...btn, background: 'rgba(74,144,226,0.3)' }}>Link</button>
              <button onClick={() => setShowLink(false)} style={btn}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Backlinks / Mentions ───────────────────────────────────────── */}
      {(backlinks ?? []).length > 0 && (
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div onClick={() => setShowBacklinks(!showBacklinks)}
            style={{ padding: '7px 16px 6px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none' }}>
            <span>{showBacklinks ? '▾' : '▸'}</span>
            <span>Mentions ({(backlinks ?? []).length})</span>
          </div>
          {showBacklinks && (
            <div style={{ padding: '0 16px 8px', maxHeight: 110, overflowY: 'auto' }}>
              {(backlinks ?? []).map(bl => (
                <div key={bl.id} onClick={() => onNavigate(bl.id)}
                  style={{ padding: '3px 0', fontSize: 12, color: '#a8c8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: bl.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bl.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ height: 6 }} />
    </div>
  )
}
