import Mention from '@tiptap/extension-mention'
import tippy, { type Instance, type Props } from 'tippy.js'
import type { Thought } from '../../../shared/types'

export function buildMentionExtension(getThoughts: () => Thought[], onNavigate: (id: string) => void) {
  return Mention.configure({
    HTMLAttributes: { class: 'thought-mention' },
    renderHTML({ options, node }) {
      return [
        'span',
        {
          ...options.HTMLAttributes,
          'data-id': node.attrs.id,
          'data-label': node.attrs.label,
          title: node.attrs.label,
          style: 'color:#b8a8ff;cursor:pointer;text-decoration:underline dotted;display:inline;'
        },
        `${options.suggestion.char}${node.attrs.label}`
      ]
    },
    suggestion: {
      char: '[[',
      items: ({ query }: { query: string }) =>
        getThoughts()
          .filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8),

      render: () => {
        let container: HTMLDivElement | null = null
        let popup: Instance<Props>[] | null = null
        let selectedIdx = 0
        let currentItems: Thought[] = []
        let currentCommand: ((attrs: { id: string; label: string }) => void) | null = null

        function rebuildList() {
          if (!container) return
          container.innerHTML = ''
          if (currentItems.length === 0) {
            const empty = document.createElement('div')
            empty.style.cssText = 'padding:10px 14px;font-size:12px;color:rgba(255,255,255,0.35);'
            empty.textContent = 'No thoughts found'
            container.appendChild(empty)
            return
          }
          currentItems.forEach((item, i) => {
            const el = document.createElement('div')
            el.style.cssText = `
              padding:8px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;
              color:${i === selectedIdx ? '#fff' : '#b0c4de'};
              background:${i === selectedIdx ? 'rgba(74,144,226,0.25)' : 'transparent'};
            `
            const dot = document.createElement('span')
            dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${item.color};flex-shrink:0;`
            el.appendChild(dot)
            const label = document.createElement('span')
            label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
            label.textContent = item.title
            el.appendChild(label)
            el.addEventListener('mousedown', (e) => {
              e.preventDefault()
              currentCommand?.({ id: item.id, label: item.title })
            })
            container?.appendChild(el)
          })
        }

        return {
          onStart: (props: { clientRect?: (() => DOMRect | null) | null; items: Thought[]; command: (attrs: { id: string; label: string }) => void }) => {
            container = document.createElement('div')
            container.style.cssText = `
              background:#1e2a3a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;
              overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.6);min-width:200px;max-width:280px;
            `
            currentItems = props.items as Thought[]
            currentCommand = props.command
            selectedIdx = 0
            rebuildList()

            popup = tippy('body', {
              getReferenceClientRect: props.clientRect as () => DOMRect,
              appendTo: () => document.body,
              content: container,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
            })
          },

          onUpdate: (props: { clientRect?: (() => DOMRect | null) | null; items: Thought[]; command: (attrs: { id: string; label: string }) => void }) => {
            if (!container || !popup) return
            currentItems = props.items as Thought[]
            currentCommand = props.command
            selectedIdx = 0
            rebuildList()
            popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
          },

          onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'Escape') {
              popup?.[0]?.hide()
              return true
            }
            if (event.key === 'ArrowDown') {
              selectedIdx = Math.min(selectedIdx + 1, currentItems.length - 1)
              rebuildList()
              return true
            }
            if (event.key === 'ArrowUp') {
              selectedIdx = Math.max(selectedIdx - 1, 0)
              rebuildList()
              return true
            }
            if (event.key === 'Enter') {
              const item = currentItems[selectedIdx]
              if (item) {
                currentCommand?.({ id: item.id, label: item.title })
                return true
              }
            }
            return false
          },

          onExit: () => {
            popup?.[0]?.destroy()
            popup = null
            container = null
          }
        }
      }
    }
  })
}
