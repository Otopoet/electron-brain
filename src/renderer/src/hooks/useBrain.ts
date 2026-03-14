import { useState, useCallback, useEffect } from 'react'
import type { Thought, Neighborhood, Attachment, Tag, ThoughtType, LinkType, IndexStatus, ThoughtWithScore } from '../../../shared/types'

export interface BrainState {
  activeId: string | null
  neighborhood: Neighborhood | null
  allThoughts: Thought[]
  allTags: Tag[]
  allTypes: ThoughtType[]
  allLinkTypes: LinkType[]
  pinnedThoughts: Thought[]
  history: string[]   // last 20 navigated IDs, most-recent first
  loading: boolean
  indexStatus: IndexStatus
}

export function useBrain() {
  const [state, setState] = useState<BrainState>({
    activeId: null, neighborhood: null, allThoughts: [], allTags: [], allTypes: [],
    allLinkTypes: [], pinnedThoughts: [], history: [], loading: false,
    indexStatus: { indexed: 0, total: 0, loading: false }
  })

  const refreshAllThoughts = useCallback(async () => {
    const thoughts = await window.brain.getAllThoughts()
    setState(s => ({ ...s, allThoughts: thoughts }))
  }, [])

  const refreshMeta = useCallback(async () => {
    const [tags, types, linkTypes, pinned] = await Promise.all([
      window.brain.getAllTags(),
      window.brain.getAllTypes(),
      window.brain.getAllLinkTypes(),
      window.brain.getPinnedThoughts()
    ])
    setState(s => ({ ...s, allTags: tags, allTypes: types, allLinkTypes: linkTypes, pinnedThoughts: pinned }))
  }, [])

  const refreshPinned = useCallback(async () => {
    const pinned = await window.brain.getPinnedThoughts()
    setState(s => ({ ...s, pinnedThoughts: pinned }))
  }, [])

  const refreshLinkTypes = useCallback(async () => {
    const linkTypes = await window.brain.getAllLinkTypes()
    setState(s => ({ ...s, allLinkTypes: linkTypes }))
  }, [])

  // Subscribe to embedding index progress events from main process
  useEffect(() => {
    const off = window.brain.onIndexProgress(status => {
      setState(s => ({ ...s, indexStatus: status }))
    })
    // Fetch initial status
    window.brain.getIndexStatus().then(status => {
      setState(s => ({ ...s, indexStatus: status }))
    })
    return off
  }, [])

  useEffect(() => {
    refreshAllThoughts()
    refreshMeta()
  }, [refreshAllThoughts, refreshMeta])

  const refreshNeighborhood = useCallback(async (id: string) => {
    const neighborhood = await window.brain.getNeighborhood(id)
    setState(s => ({ ...s, neighborhood }))
  }, [])

  const navigate = useCallback(async (id: string) => {
    setState(s => ({
      ...s,
      loading: true,
      history: [id, ...s.history.filter(h => h !== id)].slice(0, 20)
    }))
    try {
      const neighborhood = await window.brain.getNeighborhood(id)
      setState(s => ({ ...s, activeId: id, neighborhood, loading: false }))
    } catch (err) {
      console.error('navigate error', err)
      setState(s => ({ ...s, loading: false }))
    }
  }, [])

  // Create one or more thoughts. Titles can be semicolon-separated for batch creation.
  const createThought = useCallback(async (rawTitle: string, linkToActiveAs?: 'child' | 'jump' | 'parent') => {
    const titles = rawTitle.split(';').map(t => t.trim()).filter(Boolean)
    const created: Thought[] = []

    for (const title of titles) {
      const thought = await window.brain.createThought(title)
      created.push(thought)
      if (state.activeId) {
        if (linkToActiveAs === 'child') {
          await window.brain.createLink(state.activeId, thought.id, 'child')
        } else if (linkToActiveAs === 'parent') {
          await window.brain.createLink(thought.id, state.activeId, 'child')
        } else if (linkToActiveAs === 'jump') {
          await window.brain.createLink(state.activeId, thought.id, 'jump')
        }
      }
    }

    await refreshAllThoughts()
    // Navigate to last created thought
    if (created.length > 0) await navigate(created[created.length - 1].id)
    return created
  }, [state.activeId, refreshAllThoughts, navigate])

  const updateThought = useCallback(async (id: string, patch: Partial<Omit<Thought, 'id' | 'created_at'>>) => {
    await window.brain.updateThought(id, patch)
    await refreshAllThoughts()
    if (state.activeId) await refreshNeighborhood(state.activeId)
  }, [state.activeId, refreshAllThoughts, refreshNeighborhood])

  const deleteThought = useCallback(async (id: string) => {
    await window.brain.deleteThought(id)
    await refreshAllThoughts()
    await refreshPinned()
    if (state.activeId === id) {
      const thoughts = await window.brain.getAllThoughts()
      if (thoughts.length > 0) await navigate(thoughts[0].id)
      else setState(s => ({ ...s, activeId: null, neighborhood: null }))
    } else if (state.activeId) {
      await refreshNeighborhood(state.activeId)
    }
  }, [state.activeId, navigate, refreshAllThoughts, refreshNeighborhood, refreshPinned])

  const createLink = useCallback(async (sourceId: string, targetId: string, type: 'child' | 'jump', label?: string, isOneWay?: number) => {
    await window.brain.createLink(sourceId, targetId, type, label, isOneWay)
    if (state.activeId) await refreshNeighborhood(state.activeId)
  }, [state.activeId, refreshNeighborhood])

  const updateLink = useCallback(async (id: string, patch: { label?: string; is_one_way?: number; color?: string; width?: number; link_type_id?: string | null }) => {
    await window.brain.updateLink(id, patch)
    if (state.activeId) await refreshNeighborhood(state.activeId)
  }, [state.activeId, refreshNeighborhood])

  const deleteLink = useCallback(async (id: string) => {
    await window.brain.deleteLink(id)
    if (state.activeId) await refreshNeighborhood(state.activeId)
  }, [state.activeId, refreshNeighborhood])

  const addAttachment = useCallback(async (type: 'file' | 'url', name: string, filePath: string): Promise<Attachment | null> => {
    if (!state.activeId) return null
    const att = await window.brain.addAttachment(state.activeId, type, name, filePath)
    await refreshNeighborhood(state.activeId)
    return att
  }, [state.activeId, refreshNeighborhood])

  const deleteAttachment = useCallback(async (id: string) => {
    await window.brain.deleteAttachment(id)
    if (state.activeId) await refreshNeighborhood(state.activeId)
  }, [state.activeId, refreshNeighborhood])

  const pickAndAttachFile = useCallback(async () => {
    const file = await window.brain.pickFile()
    if (!file || !state.activeId) return
    await addAttachment('file', file.name, file.path)
  }, [state.activeId, addAttachment])

  // Tags
  const createTag = useCallback(async (name: string, color: string): Promise<Tag> => {
    const tag = await window.brain.createTag(name, color)
    await refreshMeta()
    return tag
  }, [refreshMeta])

  const addTagToThought = useCallback(async (tagId: string) => {
    if (!state.activeId) return
    await window.brain.addTagToThought(state.activeId, tagId)
    await refreshNeighborhood(state.activeId)
  }, [state.activeId, refreshNeighborhood])

  const removeTagFromThought = useCallback(async (tagId: string) => {
    if (!state.activeId) return
    await window.brain.removeTagFromThought(state.activeId, tagId)
    await refreshNeighborhood(state.activeId)
  }, [state.activeId, refreshNeighborhood])

  // Types
  const createType = useCallback(async (name: string, color: string, icon?: string): Promise<ThoughtType> => {
    const t = await window.brain.createType(name, color, icon)
    await refreshMeta()
    return t
  }, [refreshMeta])

  // Pin
  const togglePin = useCallback(async (id: string) => {
    await window.brain.togglePin(id)
    await refreshPinned()
    // Refresh neighborhood so pin icon updates
    if (state.activeId) await refreshNeighborhood(state.activeId)
    await refreshAllThoughts()
  }, [state.activeId, refreshPinned, refreshNeighborhood, refreshAllThoughts])

  // Link types
  const createLinkType = useCallback(async (name: string, color: string, width: number): Promise<LinkType> => {
    const lt = await window.brain.createLinkType(name, color, width)
    await refreshLinkTypes()
    return lt
  }, [refreshLinkTypes])

  const deleteLinkType = useCallback(async (id: string) => {
    await window.brain.deleteLinkType(id)
    await refreshLinkTypes()
  }, [refreshLinkTypes])

  // Semantic search
  const semanticSearch = useCallback(async (query: string, topK = 10): Promise<ThoughtWithScore[]> => {
    return window.brain.semanticSearch(query, topK)
  }, [])

  return {
    ...state,
    navigate,
    createThought,
    updateThought,
    deleteThought,
    createLink,
    updateLink,
    deleteLink,
    addAttachment,
    deleteAttachment,
    pickAndAttachFile,
    refreshAllThoughts,
    createTag,
    addTagToThought,
    removeTagFromThought,
    createType,
    togglePin,
    createLinkType,
    deleteLinkType,
    semanticSearch
  }
}
