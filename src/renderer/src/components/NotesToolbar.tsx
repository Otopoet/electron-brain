import type { Editor } from '@tiptap/core'

const tbBtn = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(74,144,226,0.22)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${active ? 'rgba(74,144,226,0.4)' : 'rgba(255,255,255,0.07)'}`,
  color: active ? '#a8c8f0' : 'rgba(255,255,255,0.45)',
  borderRadius: 3,
  padding: '2px 5px',
  fontSize: 11,
  cursor: 'pointer',
  minWidth: 22,
  fontFamily: 'inherit',
  lineHeight: 1.4,
  userSelect: 'none',
})

interface Props {
  editor: Editor | null
}

export function NotesToolbar({ editor }: Props) {
  if (!editor) return null

  const { chain, isActive } = editor

  type BtnDef = { label: string; title: string; active: boolean; onClick: () => void } | { sep: true }

  const buttons: BtnDef[] = [
    { label: 'B',  title: 'Bold',          active: isActive('bold'),      onClick: () => chain().focus().toggleBold().run() },
    { label: 'I',  title: 'Italic',        active: isActive('italic'),    onClick: () => chain().focus().toggleItalic().run() },
    { label: 'U',  title: 'Underline',     active: isActive('underline'), onClick: () => chain().focus().toggleUnderline().run() },
    { label: 'S',  title: 'Strikethrough', active: isActive('strike'),    onClick: () => chain().focus().toggleStrike().run() },
    { label: '<>', title: 'Inline code',   active: isActive('code'),      onClick: () => chain().focus().toggleCode().run() },
    { sep: true },
    { label: 'H1', title: 'Heading 1', active: isActive('heading', { level: 1 }), onClick: () => chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'H2', title: 'Heading 2', active: isActive('heading', { level: 2 }), onClick: () => chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'H3', title: 'Heading 3', active: isActive('heading', { level: 3 }), onClick: () => chain().focus().toggleHeading({ level: 3 }).run() },
    { sep: true },
    { label: '≡',  title: 'Bullet list',   active: isActive('bulletList'),  onClick: () => chain().focus().toggleBulletList().run() },
    { label: '1.', title: 'Ordered list',  active: isActive('orderedList'), onClick: () => chain().focus().toggleOrderedList().run() },
    { label: '❝',  title: 'Blockquote',    active: isActive('blockquote'),  onClick: () => chain().focus().toggleBlockquote().run() },
    { label: '{ }',title: 'Code block',    active: isActive('codeBlock'),   onClick: () => chain().focus().toggleCodeBlock().run() },
    { sep: true },
    { label: '⊞',  title: 'Insert 3×3 table', active: false, onClick: () => chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { sep: true },
    { label: '↺',  title: 'Undo (⌘Z)',   active: false, onClick: () => chain().focus().undo().run() },
    { label: '↻',  title: 'Redo (⌘⇧Z)', active: false, onClick: () => chain().focus().redo().run() },
  ]

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 2, padding: '4px 8px 4px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(0,0,0,0.12)', flexShrink: 0
    }}>
      {buttons.map((b, i) =>
        'sep' in b ? (
          <div key={i} style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '2px 2px', alignSelf: 'center' }} />
        ) : (
          <button key={i} onMouseDown={e => { e.preventDefault(); b.onClick() }} title={b.title} style={tbBtn(b.active)}>
            {b.label}
          </button>
        )
      )}
    </div>
  )
}
