import { useState, useCallback, useEffect, useRef } from 'react'
import type { Thought, Neighborhood, Attachment, Tag, ThoughtType, LinkType, IndexStatus, ThoughtWithScore } from '../../../shared/types'

export interface BrainState {
  activeId: string | null
  neighborhood: Neighborhood | null
  allThoughts: Thought[]
  allTags: Tag[]
  allTypes: ThoughtType[]
  allLinkTypes: LinkType[]
  pinnedThoughts: Thought[]
  history: string[]           // deduplicated recent visits for PastThoughts sidebar
  historyStack: string[]      // browser-style back/forward stack
  historyIndex: number        // cursor into historyStack; -1 = empty
  homeThoughtId: string | null
  loading: boolean
  indexStatus: IndexStatus
}

export function useBrain() {
  const [state, setState] = useState<BrainState>({
    activeId: null, neighborhood: null, allThoughts: [], allTags: [], allTypes: [],
    allLinkTypes: [], pinnedThoughts: [], history: [],
    historyStack: [], historyIndex: -1, homeThoughtId: null,
    loading: false, indexStatus: { indexed: 0, total: 0, loading: false }
  })

  // Refs avoid stale closure issues in async callbacks
  const historyStackRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)
  const homeThoughtIdRef = useRef<string | null>(null)
  const activeIdRef = useRef<string | null>(null)

  // Keep refs in sync after every render
  useEffect(() => {
    historyStackRef.current = state.historyStack
    historyIndexRef.current = state.historyIndex
    homeThoughtIdRef.current = state.homeThoughtId
    activeIdRef.current = state.activeId
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
    window.brain.getIndexStatus().then(status => {
      setState(s => ({ ...s, indexStatus: status }))
    })
    return off
  }, [])

  // Load home thought setting on mount
  useEffect(() => {
    window.brain.getSetting('home_thought_id').then(val => {
      if (val) setState(s => ({ ...s, homeThoughtId: val }))
    })
  }, [])

  useEffect(() => {
    refreshAllThoughts()
    refreshMeta()
  }, [refreshAllThoughts, refreshMeta])

  const refreshNeighborhood = useCallback(async (id: string) => {
    const neighborhood = await window.brain.getNeighborhood(id)
    setState(s => ({ ...s, neighborhood }))
  }, [])

  // Navigate and push to history stack (clears any forward history)
  const navigate = useCallback(async (id: string) => {
    const stack = historyStackRef.current
    const index = historyIndexRef.current
    const truncated = stack.slice(0, index + 1)
    const newStack = [...truncated, id]
    const newIndex = newStack.length - 1
    // Update refs immediately so concurrent calls see latest values
    historyStackRef.current = newStack
    historyIndexRef.current = newIndex

    setState(s => ({
      ...s,
      loading: true,
      historyStack: newStack,
      historyIndex: newIndex,
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

  // Navigate without pushing to history stack (used by goBack / goForward)
  const navigateSilent = useCallback(async (id: string, newIndex: number, newStack: string[]) => {
    historyStackRef.current = newStack
    historyIndexRef.current = newIndex
    setState(s => ({ ...s, loading: true, historyStack: newStack, historyIndex: newIndex }))
    try {
      const neighborhood = await window.brain.getNeighborhood(id)
      setState(s => ({ ...s, activeId: id, neighborhood, loading: false }))
    } catch (err) {
      console.error('navigateSilent error', err)
      setState(s => ({ ...s, loading: false }))
    }
  }, [])

  const goBack = useCallback(() => {
    const index = historyIndexRef.current
    const stack = historyStackRef.current
    if (index <= 0) return
    navigateSilent(stack[index - 1], index - 1, stack)
  }, [navigateSilent])

  const goForward = useCallback(() => {
    const index = historyIndexRef.current
    const stack = historyStackRef.current
    if (index >= stack.length - 1) return
    navigateSilent(stack[index + 1], index + 1, stack)
  }, [navigateSilent])

  const goHome = useCallback(() => {
    const homeId = homeThoughtIdRef.current
    if (homeId) navigate(homeId)
  }, [navigate])

  const setHomeThought = useCallback(async (id: string | null) => {
    await window.brain.setSetting('home_thought_id', id ?? '')
    setState(s => ({ ...s, homeThoughtId: id }))
  }, [])

  // Create one or more thoughts. Titles can be semicolon-separated for batch creation.
  const createThought = useCallback(async (rawTitle: string, linkToActiveAs?: 'child' | 'jump' | 'parent') => {
    const titles = rawTitle.split(';').map(t => t.trim()).filter(Boolean)
    const created: Thought[] = []
    const currentActiveId = activeIdRef.current

    for (const title of titles) {
      const thought = await window.brain.createThought(title)
      created.push(thought)
      if (currentActiveId) {
        if (linkToActiveAs === 'child') {
          await window.brain.createLink(currentActiveId, thought.id, 'child')
        } else if (linkToActiveAs === 'parent') {
          await window.brain.createLink(thought.id, currentActiveId, 'child')
        } else if (linkToActiveAs === 'jump') {
          await window.brain.createLink(currentActiveId, thought.id, 'jump')
        }
      }
    }

    await refreshAllThoughts()
    if (created.length > 0) await navigate(created[created.length - 1].id)
    return created
  }, [refreshAllThoughts, navigate])

  const updateThought = useCallback(async (id: string, patch: Partial<Omit<Thought, 'id' | 'created_at'>>) => {
    await window.brain.updateThought(id, patch)
    await refreshAllThoughts()
    const aid = activeIdRef.current
    if (aid) await refreshNeighborhood(aid)
  }, [refreshAllThoughts, refreshNeighborhood])

  const deleteThought = useCallback(async (id: string) => {
    await window.brain.deleteThought(id)
    await refreshAllThoughts()
    await refreshPinned()
    const aid = activeIdRef.current
    if (aid === id) {
      const thoughts = await window.brain.getAllThoughts()
      if (thoughts.length > 0) await navigate(thoughts[0].id)
      else setState(s => ({ ...s, activeId: null, neighborhood: null }))
    } else if (aid) {
      await refreshNeighborhood(aid)
    }
  }, [navigate, refreshAllThoughts, refreshNeighborhood, refreshPinned])

  const createLink = useCallback(async (sourceId: string, targetId: string, type: 'child' | 'jump', label?: string, isOneWay?: number) => {
    await window.brain.createLink(sourceId, targetId, type, label, isOneWay)
    const aid = activeIdRef.current
    if (aid) await refreshNeighborhood(aid)
  }, [refreshNeighborhood])

  const updateLink = useCallback(async (id: string, patch: { label?: string; is_one_way?: number; color?: string; width?: number; link_type_id?: string | null }) => {
    await window.brain.updateLink(id, patch)
    const aid = activeIdRef.current
    if (aid) await refreshNeighborhood(aid)
  }, [refreshNeighborhood])

  const deleteLink = useCallback(async (id: string) => {
    await window.brain.deleteLink(id)
    const aid = activeIdRef.current
    if (aid) await refreshNeighborhood(aid)
  }, [refreshNeighborhood])

  const addAttachment = useCallback(async (type: 'file' | 'url', name: string, filePath: string): Promise<Attachment | null> => {
    const aid = activeIdRef.current
    if (!aid) return null
    const att = await window.brain.addAttachment(aid, type, name, filePath)
    await refreshNeighborhood(aid)
    return att
  }, [refreshNeighborhood])

  const deleteAttachment = useCallback(async (id: string) => {
    await window.brain.deleteAttachment(id)
    const aid = activeIdRef.current
    if (aid) await refreshNeighborhood(aid)
  }, [refreshNeighborhood])

  const pickAndAttachFile = useCallback(async () => {
    const file = await window.brain.pickFile()
    if (!file) return
    await addAttachment('file', file.name, file.path)
  }, [addAttachment])

  // Tags
  const createTag = useCallback(async (name: string, color: string): Promise<Tag> => {
    const tag = await window.brain.createTag(name, color)
    await refreshMeta()
    return tag
  }, [refreshMeta])

  const addTagToThought = useCallback(async (tagId: string) => {
    const aid = activeIdRef.current
    if (!aid) return
    await window.brain.addTagToThought(aid, tagId)
    await refreshNeighborhood(aid)
  }, [refreshNeighborhood])

  const removeTagFromThought = useCallback(async (tagId: string) => {
    const aid = activeIdRef.current
    if (!aid) return
    await window.brain.removeTagFromThought(aid, tagId)
    await refreshNeighborhood(aid)
  }, [refreshNeighborhood])

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
    const aid = activeIdRef.current
    if (aid) await refreshNeighborhood(aid)
    await refreshAllThoughts()
  }, [refreshPinned, refreshNeighborhood, refreshAllThoughts])

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
    canGoBack: state.historyIndex > 0,
    canGoForward: state.historyIndex < state.historyStack.length - 1,
    navigate,
    goBack,
    goForward,
    goHome,
    setHomeThought,
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
