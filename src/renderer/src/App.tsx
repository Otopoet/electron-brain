import { useEffect, useRef, useState, useCallback } from 'react'
import { useBrain } from './hooks/useBrain'
import { Plex } from './components/Plex'
import { ThoughtPanel } from './components/ThoughtPanel'
import { SearchBar } from './components/SearchBar'
import { NewThoughtModal } from './components/NewThoughtModal'
import { PastThoughts } from './components/PastThoughts'
import { PinsBar } from './components/PinsBar'
import type { NewThoughtLinkAs } from './components/NewThoughtModal'

export function App() {
  const brain = useBrain()
  const [showNewModal, setShowNewModal] = useState(false)
  const [defaultModalLinkAs, setDefaultModalLinkAs] = useState<NewThoughtLinkAs>('child')
  const [renameCounter, setRenameCounter] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  // Navigate to first thought on mount
  useEffect(() => {
    if (!brain.activeId && brain.allThoughts.length > 0) {
      brain.navigate(brain.allThoughts[0].id)
    }
  }, [brain.allThoughts.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Menu shortcuts (macOS menu bar)
  useEffect(() => {
    const offNew = window.brain.onMenuNewThought(() => setShowNewModal(true))
    const offSearch = window.brain.onMenuFocusSearch(() => searchRef.current?.focus())
    return () => { offNew(); offSearch() }
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput = (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      )

      // Back / Forward — always active
      if (e.altKey && e.key === 'ArrowLeft')  { e.preventDefault(); brain.goBack();    return }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); brain.goForward(); return }

      // Other shortcuts only when not typing in an input
      if (!inInput) {
        if (e.key === 'F2') { e.preventDefault(); setRenameCounter(c => c + 1); return }
        if (e.key === 'F6') { e.preventDefault(); searchRef.current?.focus(); return }
        if (e.key === 'F7') {
          e.preventDefault()
          setDefaultModalLinkAs('parent')
          setShowNewModal(true)
          return
        }
        if (e.key === 'F8') {
          e.preventDefault()
          setDefaultModalLinkAs('jump')
          setShowNewModal(true)
          return
        }
        if (e.key === 'Home') { e.preventDefault(); brain.goHome(); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [brain.goBack, brain.goForward, brain.goHome]) // stable callbacks, minimal rerenders

  const openNewModal = useCallback(() => {
    setDefaultModalLinkAs('child')
    setShowNewModal(true)
  }, [])

  const handleCreate = useCallback(async (rawTitle: string, linkAs: NewThoughtLinkAs = 'child') => {
    setShowNewModal(false)

    // Comma context trick: ,child → "Active, child"  |  child, → "child, Active"
    let title = rawTitle
    if (brain.neighborhood) {
      const parentName = brain.neighborhood.thought.title
      if (title.trimStart().startsWith(',')) {
        title = parentName + ', ' + title.trimStart().slice(1).trimStart()
      } else if (title.trimEnd().endsWith(',')) {
        title = title.trimEnd().slice(0, -1).trimEnd() + ', ' + parentName
      }
    }

    if (linkAs === 'orphan') {
      await brain.createThought(title, undefined)
    } else {
      await brain.createThought(title, brain.activeId ? linkAs : undefined)
    }
  }, [brain])

  const { indexStatus } = brain
  const showIndexPill = indexStatus.loading || indexStatus.indexed < indexStatus.total

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#e8edf5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow: 'hidden', userSelect: 'none' }}>

      {/* Toolbar */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 0 80px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#10151e', flexShrink: 0 }}>

        {/* Back / Forward navigation buttons */}
        <button
          onClick={brain.goBack}
          disabled={!brain.canGoBack}
          title="Go back (Alt ←)"
          style={{
            background: 'none', border: 'none', color: brain.canGoBack ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)',
            cursor: brain.canGoBack ? 'pointer' : 'default', fontSize: 16, padding: '4px 6px', flexShrink: 0,
            transition: 'color 0.15s'
          }}
        >
          ←
        </button>
        <button
          onClick={brain.goForward}
          disabled={!brain.canGoForward}
          title="Go forward (Alt →)"
          style={{
            background: 'none', border: 'none', color: brain.canGoForward ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)',
            cursor: brain.canGoForward ? 'pointer' : 'default', fontSize: 16, padding: '4px 6px', flexShrink: 0,
            transition: 'color 0.15s'
          }}
        >
          →
        </button>
        {brain.homeThoughtId && (
          <button
            onClick={brain.goHome}
            title="Go to home thought (Home key)"
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer', fontSize: 14, padding: '4px 6px', flexShrink: 0,
              transition: 'color 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
          >
            🏠
          </button>
        )}

        <SearchBar
          onNavigate={brain.navigate}
          onCreateThought={(title, linkAs) => handleCreate(title, linkAs)}
          onSemanticSearch={brain.semanticSearch}
          indexStatus={indexStatus}
          inputRef={searchRef as React.RefObject<HTMLInputElement>}
        />

        {showIndexPill && indexStatus.total > 0 && (
          <div style={{
            fontSize: 10, color: 'rgba(123,104,238,0.75)', background: 'rgba(123,104,238,0.12)',
            border: '1px solid rgba(123,104,238,0.25)', borderRadius: 10,
            padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0
          }}>
            ⚡ {indexStatus.indexed}/{indexStatus.total}
          </div>
        )}

        <button onClick={openNewModal}
          style={{ background: 'rgba(74,144,226,0.8)', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
          + New Thought
        </button>
      </div>

      {/* Pins bar — shown when ≥1 thought is pinned */}
      <PinsBar
        pinnedThoughts={brain.pinnedThoughts}
        activeId={brain.activeId}
        onNavigate={brain.navigate}
        onUnpin={brain.togglePin}
      />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Past Thoughts history panel */}
        <PastThoughts
          history={brain.history}
          allThoughts={brain.allThoughts}
          activeId={brain.activeId}
          onNavigate={brain.navigate}
        />

        <Plex
          neighborhood={brain.neighborhood}
          activeId={brain.activeId}
          allTypes={brain.allTypes}
          allLinkTypes={brain.allLinkTypes}
          onNavigate={brain.navigate}
          onCreateChild={() => openNewModal()}
          onCreateLink={brain.createLink}
        />

        <ThoughtPanel
          neighborhood={brain.neighborhood}
          onUpdate={brain.updateThought}
          onDeleteThought={brain.deleteThought}
          onTogglePin={brain.togglePin}
          onSetHome={brain.setHomeThought}
          onAddAttachment={(type, name, path) => brain.addAttachment(type, name, path)}
          onDeleteAttachment={brain.deleteAttachment}
          onPickFile={brain.pickAndAttachFile}
          onCreateLink={brain.createLink}
          onUpdateLink={brain.updateLink}
          onDeleteLink={brain.deleteLink}
          onAddTag={brain.addTagToThought}
          onRemoveTag={brain.removeTagFromThought}
          onCreateTag={brain.createTag}
          onCreateType={brain.createType}
          onCreateLinkType={brain.createLinkType}
          onNavigate={brain.navigate}
          allThoughts={brain.allThoughts}
          allTags={brain.allTags}
          allTypes={brain.allTypes}
          allLinkTypes={brain.allLinkTypes}
          activeId={brain.activeId}
          homeThoughtId={brain.homeThoughtId}
          renameCounter={renameCounter}
        />
      </div>

      {showNewModal && (
        <NewThoughtModal
          onConfirm={handleCreate}
          onCancel={() => setShowNewModal(false)}
          defaultLinkAs={defaultModalLinkAs}
        />
      )}
    </div>
  )
}
