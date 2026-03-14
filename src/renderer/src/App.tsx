import { useEffect, useRef, useState, useCallback } from 'react'
import { useBrain } from './hooks/useBrain'
import { Plex } from './components/Plex'
import { ThoughtPanel } from './components/ThoughtPanel'
import { SearchBar } from './components/SearchBar'
import { NewThoughtModal } from './components/NewThoughtModal'
import type { NewThoughtLinkAs } from './components/NewThoughtModal'

export function App() {
  const brain = useBrain()
  const [showNewModal, setShowNewModal] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Navigate to first thought on mount
  useEffect(() => {
    if (!brain.activeId && brain.allThoughts.length > 0) {
      brain.navigate(brain.allThoughts[0].id)
    }
  }, [brain.allThoughts.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Menu shortcuts
  useEffect(() => {
    const offNew = window.brain.onMenuNewThought(() => setShowNewModal(true))
    const offSearch = window.brain.onMenuFocusSearch(() => searchRef.current?.focus())
    return () => { offNew(); offSearch() }
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
      <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 0 80px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#10151e', flexShrink: 0 }}>
        <SearchBar
          onNavigate={brain.navigate}
          onCreateThought={(title, linkAs) => handleCreate(title, linkAs)}
          onSemanticSearch={brain.semanticSearch}
          indexStatus={indexStatus}
          inputRef={searchRef as React.RefObject<HTMLInputElement>}
        />

        {/* Index progress pill — shown while indexing, disappears when complete */}
        {showIndexPill && indexStatus.total > 0 && (
          <div style={{
            fontSize: 10, color: 'rgba(123,104,238,0.75)', background: 'rgba(123,104,238,0.12)',
            border: '1px solid rgba(123,104,238,0.25)', borderRadius: 10,
            padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0
          }}>
            ⚡ {indexStatus.indexed}/{indexStatus.total}
          </div>
        )}

        <button onClick={() => setShowNewModal(true)}
          style={{ background: 'rgba(74,144,226,0.8)', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
          + New Thought
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Plex
          neighborhood={brain.neighborhood}
          activeId={brain.activeId}
          onNavigate={brain.navigate}
          onCreateChild={() => setShowNewModal(true)}
        />
        <ThoughtPanel
          neighborhood={brain.neighborhood}
          onUpdate={brain.updateThought}
          onDeleteThought={brain.deleteThought}
          onAddAttachment={(type, name, path) => brain.addAttachment(type, name, path)}
          onDeleteAttachment={brain.deleteAttachment}
          onPickFile={brain.pickAndAttachFile}
          onCreateLink={brain.createLink}
          onAddTag={brain.addTagToThought}
          onRemoveTag={brain.removeTagFromThought}
          onCreateTag={brain.createTag}
          onNavigate={brain.navigate}
          allThoughts={brain.allThoughts}
          allTags={brain.allTags}
          allTypes={brain.allTypes}
          activeId={brain.activeId}
        />
      </div>

      {showNewModal && (
        <NewThoughtModal onConfirm={handleCreate} onCancel={() => setShowNewModal(false)} />
      )}
    </div>
  )
}
