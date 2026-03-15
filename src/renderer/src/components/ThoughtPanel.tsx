import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import type { Neighborhood, Attachment, Thought, Tag, ThoughtType, LinkType, Link } from '../../../shared/types'
import { FilePreview } from './FilePreview'
import { buildMentionExtension } from './MentionExtension'
import { NotesToolbar } from './NotesToolbar'
import { MappedLinksFooter } from './MappedLinksFooter'

interface Props {
  neighborhood: Neighborhood | null
  onUpdate: (id: string, patch: Partial<Pick<Thought, 'title' | 'notes' | 'color' | 'type_id'>>) => void
  onDeleteThought: (id: string) => void
  onTogglePin: (id: string) => void
  onAddAttachment: (type: 'file' | 'url', name: string, path: string) => void
  onDeleteAttachment: (id: string) => void
  onPickFile: () => void
  onCreateLink: (sourceId: string, targetId: string, type: 'child' | 'jump') => void
  onUpdateLink: (id: string, patch: { label?: string; is_one_way?: number; color?: string; width?: number; link_type_id?: string | null }) => void
  onDeleteLink: (id: string) => void
  onAddTag: (tagId: string) => void
  onRemoveTag: (tagId: string) => void
  onCreateTag: (name: string, color: string) => Promise<Tag>
  onCreateType: (name: string, color: string, icon?: string) => Promise<ThoughtType>
  onCreateLinkType: (name: string, color: string, width: number) => Promise<LinkType>
  onNavigate: (id: string) => void
  onSetHome: (id: string | null) => void
  allThoughts: Thought[]
  allTags: Tag[]
  allTypes: ThoughtType[]
  allLinkTypes: LinkType[]
  activeId: string | null
  homeThoughtId: string | null
  renameCounter?: number
}

const COLORS = ['#4A90E2','#7B68EE','#E24A4A','#4AE28A','#E2B94A','#E24AB5','#4AE2D8','#9E9E9E']
const TAG_PALETTE = ['#4A90E2','#7B68EE','#E24A4A','#4AE28A','#E2B94A','#E24AB5','#4AE2D8','#888']
const LINK_COLORS = ['', '#5a7fa0','#f0a500','#7B68EE','#E24A4A','#4AE28A','#E24AB5','#4AE2D8']
const WIDTH_OPTIONS = [{ label: 'Default', value: 0 }, { label: 'Thin', value: 1 }, { label: 'Normal', value: 1.5 }, { label: 'Thick', value: 3 }]

const btn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.6)', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer'
}
const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4, padding: '5px 8px', color: '#e8edf5', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' as const
}
const sectionLabel: React.CSSProperties = {
  padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, flexShrink: 0, userSelect: 'none' as const
}

function resolveLink(link: Link, allLinkTypes: LinkType[]) {
  const lt = allLinkTypes.find(t => t.id === link.link_type_id)
  return {
    color: link.color || lt?.color || (link.type === 'child' ? '#5a7fa0' : '#f0a500'),
    width: link.width || lt?.width || 1.5
  }
}

export function ThoughtPanel({
  neighborhood, onUpdate, onDeleteThought, onTogglePin, onAddAttachment, onDeleteAttachment,
  onPickFile, onCreateLink, onUpdateLink, onDeleteLink, onAddTag, onRemoveTag,
  onCreateTag, onCreateType, onCreateLinkType, onNavigate, onSetHome,
  allThoughts, allTags, allTypes, allLinkTypes, activeId, homeThoughtId, renameCounter
}: Props) {
  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [linkTarget, setLinkTarget] = useState('')
  const [linkType, setLinkType] = useState<'child' | 'jump'>('child')
  const [linkFormLinkTypeId, setLinkFormLinkTypeId] = useState('')
  const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0])
  const [showNewType, setShowNewType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeColor, setNewTypeColor] = useState(COLORS[0])
  const [newTypeIcon, setNewTypeIcon] = useState('')
  const [showNewLinkType, setShowNewLinkType] = useState(false)
  const [newLinkTypeName, setNewLinkTypeName] = useState('')
  const [newLinkTypeColor, setNewLinkTypeColor] = useState('#5a7fa0')
  const [newLinkTypeWidth, setNewLinkTypeWidth] = useState(1.5)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [showBacklinks, setShowBacklinks] = useState(true)
  const [showLinksSection, setShowLinksSection] = useState(true)
  const titleRef = useRef<HTMLInputElement>(null)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable ref for allThoughts so mention extension doesn't need recreation
  const allThoughtsRef = useRef(allThoughts)
  useEffect(() => { allThoughtsRef.current = allThoughts }, [allThoughts])

  const onNavigateRef = useRef(onNavigate)
  useEffect(() => { onNavigateRef.current = onNavigate }, [onNavigate])

  const mentionExt = useMemo(
    () => buildMentionExtension(() => allThoughtsRef.current, (id) => onNavigateRef.current(id)),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const editor = useEditor({
    extensions: [
      StarterKit,
      mentionExt,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
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
    setEditingLinkId(null)
    if (editor && editor.getHTML() !== neighborhood.thought.notes) {
      editor.commands.setContent(neighborhood.thought.notes || '', false)
    }
  }, [neighborhood?.thought.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // F2 rename trigger from parent
  useEffect(() => {
    if (renameCounter && renameCounter > 0) setEditingTitle(true)
  }, [renameCounter])

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
    setLinkFormLinkTypeId('')
  }, [linkTarget, linkType, activeId, onCreateLink])

  const handleCreateTag = useCallback(() => {
    if (!newTagName.trim()) return
    onCreateTag(newTagName.trim(), newTagColor).then(tag => {
      onAddTag(tag.id)
      setNewTagName(''); setShowNewTag(false); setShowTagPicker(false)
    })
  }, [newTagName, newTagColor, onCreateTag, onAddTag])

  const handleCreateType = useCallback(() => {
    if (!newTypeName.trim()) return
    onCreateType(newTypeName.trim(), newTypeColor, newTypeIcon.trim() || undefined).then(() => {
      setNewTypeName(''); setNewTypeIcon(''); setShowNewType(false)
    })
  }, [newTypeName, newTypeColor, newTypeIcon, onCreateType])

  const handleCreateLinkType = useCallback(() => {
    if (!newLinkTypeName.trim()) return
    onCreateLinkType(newLinkTypeName.trim(), newLinkTypeColor, newLinkTypeWidth).then(lt => {
      setNewLinkTypeName(''); setShowNewLinkType(false)
      setLinkFormLinkTypeId(lt.id)
    })
  }, [newLinkTypeName, newLinkTypeColor, newLinkTypeWidth, onCreateLinkType])

  // Click delegation for mention chips in editor
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('thought-mention')) {
      const id = target.getAttribute('data-id')
      if (id) onNavigate(id)
    }
  }, [onNavigate])

  if (!neighborhood) return (
    <div style={{ width: 320, borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
      Select a thought
    </div>
  )

  const { thought, attachments, tags, backlinks, links } = neighborhood
  const appliedTagIds = new Set((tags ?? []).map(t => t.id))
  const availableTags = allTags.filter(t => !appliedTagIds.has(t.id))
  const activeType = allTypes.find(t => t.id === thought.type_id)

  return (
    <div style={{ width: 320, minWidth: 280, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#141c26', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>

        {/* Color swatches */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, alignItems: 'center' }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => onUpdate(thought.id, { color: c })}
              style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: thought.color === c ? '2px solid #fff' : '2px solid transparent' }} />
          ))}
          {/* Home button */}
          <button
            onClick={() => onSetHome(thought.id === homeThoughtId ? null : thought.id)}
            title={thought.id === homeThoughtId ? 'Clear home thought' : 'Set as home thought'}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, opacity: thought.id === homeThoughtId ? 1 : 0.3, padding: '2px 4px',
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = thought.id === homeThoughtId ? '1' : '0.3')}
          >
            🏠
          </button>
          {/* Pin button */}
          <button
            onClick={() => onTogglePin(thought.id)}
            title={thought.is_pinned ? 'Unpin' : 'Pin'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, opacity: thought.is_pinned ? 1 : 0.35, padding: '2px 4px',
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = thought.is_pinned ? '1' : '0.35')}
          >
            📌
          </button>
        </div>

        {/* Type selector */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <select
              value={thought.type_id ?? ''}
              onChange={e => {
                const typeId = e.target.value || null
                const type = allTypes.find(t => t.id === typeId)
                onUpdate(thought.id, { type_id: typeId, ...(type ? { color: type.color } : {}) })
              }}
              style={{ ...inp, fontSize: 11, padding: '3px 6px', flex: 1 }}
            >
              <option value="">No type</option>
              {allTypes.map(t => (
                <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ${t.name}` : t.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowNewType(s => !s)}
              title="Create new type"
              style={{ ...btn, padding: '3px 7px', fontSize: 13, flexShrink: 0 }}
            >
              +
            </button>
          </div>

          {/* Type creation form */}
          {showNewType && (
            <div style={{ marginTop: 6, background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <input placeholder="Type name…" value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateType()}
                  autoFocus style={{ ...inp, fontSize: 11, flex: 1 }} />
                <input placeholder="🎭" value={newTypeIcon} onChange={e => setNewTypeIcon(e.target.value)}
                  style={{ ...inp, fontSize: 13, width: 44, padding: '5px 6px', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setNewTypeColor(c)}
                    style={{ width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer', border: newTypeColor === c ? '2px solid #fff' : '2px solid transparent' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={handleCreateType} style={{ ...btn, background: 'rgba(74,144,226,0.3)', fontSize: 10 }}>Create</button>
                <button onClick={() => { setShowNewType(false); setNewTypeName(''); setNewTypeIcon('') }} style={{ ...btn, fontSize: 10 }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Title + type icon */}
        {editingTitle ? (
          <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') titleRef.current?.blur()
              if (e.key === 'Escape') { setTitle(thought.title); setEditingTitle(false) }
            }}
            autoFocus
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(74,144,226,0.6)', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 16, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }} />
        ) : (
          <div onClick={() => setEditingTitle(true)}
            style={{ fontSize: 16, fontWeight: 600, color: '#e8edf5', cursor: 'text', padding: '4px 0', lineHeight: 1.3, wordBreak: 'break-word', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {activeType?.icon && <span style={{ fontSize: 18 }}>{activeType.icon}</span>}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.07)', minHeight: 100 }}>
        <div style={sectionLabel}>Notes</div>
        <NotesToolbar editor={editor} />
        <div style={{ flex: 1, overflow: 'auto', padding: '0 10px 10px' }} onClick={handleEditorClick}>
          <EditorContent editor={editor} />
        </div>
        <MappedLinksFooter neighborhood={neighborhood} onNavigate={onNavigate} />
      </div>

      {/* ── Links ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', maxHeight: showLinksSection ? 280 : 'auto' }}>
        <div onClick={() => setShowLinksSection(s => !s)}
          style={{ ...sectionLabel, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{showLinksSection ? '▾' : '▸'}</span>
          <span>Links ({(links ?? []).length})</span>
        </div>

        {showLinksSection && (
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {(links ?? []).map(link => {
              const otherId = link.source_id === activeId ? link.target_id : link.source_id
              const other = allThoughts.find(t => t.id === otherId)
              if (!other) return null
              const isSource = link.source_id === activeId
              const dirIcon = link.type === 'jump' ? '⟷' : (isSource ? '→' : '←')
              const { color: lc } = resolveLink(link, allLinkTypes)
              const lt = allLinkTypes.find(t => t.id === link.link_type_id)
              const isEditing = editingLinkId === link.id

              return (
                <div key={link.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 16px 5px 12px' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{dirIcon}</span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: other.color, flexShrink: 0 }} />
                    <span onClick={() => onNavigate(other.id)}
                      style={{ flex: 1, fontSize: 12, color: '#a8c8f0', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {other.title}
                    </span>
                    {lt && <span style={{ fontSize: 9, color: lt.color, flexShrink: 0, opacity: 0.8 }}>{lt.name}</span>}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: lc, flexShrink: 0, cursor: 'pointer' }}
                      onClick={() => setEditingLinkId(isEditing ? null : link.id)} title="Edit link style" />
                  </div>

                  {/* Link edit popover */}
                  {isEditing && (
                    <div style={{ margin: '0 12px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {/* Color */}
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>COLOR</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {LINK_COLORS.map((c, ci) => (
                            <div key={ci} onClick={() => onUpdateLink(link.id, { color: c })}
                              title={c || 'Default'}
                              style={{ width: 14, height: 14, borderRadius: '50%', background: c || '#444', cursor: 'pointer', border: link.color === c ? '2px solid #fff' : '2px solid transparent', outline: c === '' ? '1px dashed rgba(255,255,255,0.3)' : 'none' }} />
                          ))}
                        </div>
                      </div>
                      {/* Width */}
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>WIDTH</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {WIDTH_OPTIONS.map(w => (
                            <button key={w.value} onClick={() => onUpdateLink(link.id, { width: w.value })}
                              style={{ ...btn, fontSize: 9, padding: '2px 5px', background: link.width === w.value ? 'rgba(74,144,226,0.35)' : 'rgba(255,255,255,0.06)' }}>
                              {w.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Link type */}
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>LINK TYPE</div>
                        <select value={link.link_type_id ?? ''} onChange={e => onUpdateLink(link.id, { link_type_id: e.target.value || null })}
                          style={{ ...inp, fontSize: 10, padding: '3px 5px' }}>
                          <option value="">None</option>
                          {allLinkTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                        </select>
                      </div>
                      {/* Label */}
                      <div style={{ marginBottom: 6 }}>
                        <input placeholder="Link label…" defaultValue={link.label}
                          onBlur={e => onUpdateLink(link.id, { label: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          style={{ ...inp, fontSize: 10 }} />
                      </div>
                      <button onClick={() => { if (window.confirm('Delete this link?')) { onDeleteLink(link.id); setEditingLinkId(null) } }}
                        style={{ ...btn, fontSize: 9, color: 'rgba(226,74,74,0.7)', borderColor: 'rgba(226,74,74,0.3)' }}>
                        Delete link
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Link creation */}
        <div style={{ display: 'flex', gap: 6, padding: '6px 16px 4px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowLink(!showLink)} style={btn}>+ Link</button>
        </div>

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
            {/* Link type selector */}
            <div style={{ display: 'flex', gap: 4 }}>
              <select value={linkFormLinkTypeId} onChange={e => setLinkFormLinkTypeId(e.target.value)} style={{ ...inp, flex: 1 }}>
                <option value="">No link type</option>
                {allLinkTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
              </select>
              <button onClick={() => setShowNewLinkType(s => !s)} title="Create link type" style={{ ...btn, padding: '3px 7px', fontSize: 13, flexShrink: 0 }}>+</button>
            </div>

            {/* New link type form */}
            {showNewLinkType && (
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 5, padding: '7px 8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input placeholder="Type name (e.g. Inspired by)…" value={newLinkTypeName} onChange={e => setNewLinkTypeName(e.target.value)}
                  autoFocus style={{ ...inp, fontSize: 11 }} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {LINK_COLORS.filter(Boolean).map(c => (
                    <div key={c} onClick={() => setNewLinkTypeColor(c)}
                      style={{ width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer', border: newLinkTypeColor === c ? '2px solid #fff' : '2px solid transparent' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Width:</span>
                  {WIDTH_OPTIONS.filter(w => w.value > 0).map(w => (
                    <button key={w.value} onClick={() => setNewLinkTypeWidth(w.value)}
                      style={{ ...btn, fontSize: 9, padding: '2px 5px', background: newLinkTypeWidth === w.value ? 'rgba(74,144,226,0.35)' : 'rgba(255,255,255,0.06)' }}>
                      {w.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={handleCreateLinkType} style={{ ...btn, background: 'rgba(74,144,226,0.3)', fontSize: 10 }}>Create</button>
                  <button onClick={() => { setShowNewLinkType(false); setNewLinkTypeName('') }} style={{ ...btn, fontSize: 10 }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={linkThought} style={{ ...btn, background: 'rgba(74,144,226,0.3)' }}>Link</button>
              <button onClick={() => setShowLink(false)} style={btn}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Attachments ────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, maxHeight: 220, overflowY: 'auto', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={sectionLabel}>Attachments</div>
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
      </div>

      {/* ── Backlinks / Mentions ───────────────────────────────────────── */}
      {(backlinks ?? []).length > 0 && (
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div onClick={() => setShowBacklinks(!showBacklinks)}
            style={{ ...sectionLabel, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
