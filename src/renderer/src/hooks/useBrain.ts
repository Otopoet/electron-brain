import { useState, useCallback, useEffect } from 'react'
import type { Thought, Neighborhood, Attachment } from '../../../shared/types'

export interface BrainState {
  activeId: string | null
  neighborhood: Neighborhood | null
  allThoughts: Thought[]
  loading: boolean
}

export function useBrain() {
  const [state, setState] = useState<BrainState>({
    activeId: null, neighborhood: null, allThoughts: [], loading: false
  })

  const refreshAllThoughts = useCallback(async () => {
    const thoughts = await window.brain.getAllThoughts()
    setState(s => ({ ...s, allThoughts: thoughts }))
  }, [])

  useEffect(() => { refreshAllThoughts() }, [refreshAllThoughts])

  const navigate = useCallback(async (id: string) => {
    setState(s => ({ ...s, loading: true }))
    try {
      const neighborhood = await window.brain.getNeighborhood(id)
      setState(s => ({ ...s, activeId: id, neighborhood, loading: false }))
    } catch (err) {
      console.error('navigate error', err)
      setState(s => ({ ...s, loading: false }))
    }
  }, [])

  const createThought = useCallback(async (title: string, linkToActiveAs?: 'child' | 'jump') => {
    const thought = await window.brain.createThought(title)
    if (linkToActiveAs && state.activeId) {
      await window.brain.createLink(state.activeId, thought.id, linkToActiveAs)
    }
    await refreshAllThoughts()
    await navigate(thought.id)
    return thought
  }, [state.activeId, refreshAllThoughts, navigate])

  const updateThought = useCallback(async (id: string, patch: Partial<Omit<Thought, 'id' | 'created_at'>>) => {
    await window.brain.updateThought(id, patch)
    await refreshAllThoughts()
    if (state.activeId) {
      const neighborhood = await window.brain.getNeighborhood(state.activeId)
      setState(s => ({ ...s, neighborhood }))
    }
  }, [state.activeId, refreshAllThoughts])

  const deleteThought = useCallback(async (id: string) => {
    await window.brain.deleteThought(id)
    await refreshAllThoughts()
    if (state.activeId === id) {
      const thoughts = await window.brain.getAllThoughts()
      if (thoughts.length > 0) await navigate(thoughts[0].id)
      else setState(s => ({ ...s, activeId: null, neighborhood: null }))
    } else if (state.activeId) {
      const neighborhood = await window.brain.getNeighborhood(state.activeId)
      setState(s => ({ ...s, neighborhood }))
    }
  }, [state.activeId, navigate, refreshAllThoughts])

  const createLink = useCallback(async (sourceId: string, targetId: string, type: 'child' | 'jump') => {
    await window.brain.createLink(sourceId, targetId, type)
    if (state.activeId) {
      const neighborhood = await window.brain.getNeighborhood(state.activeId)
      setState(s => ({ ...s, neighborhood }))
    }
  }, [state.activeId])

  const deleteLink = useCallback(async (id: string) => {
    await window.brain.deleteLink(id)
    if (state.activeId) {
      const neighborhood = await window.brain.getNeighborhood(state.activeId)
      setState(s => ({ ...s, neighborhood }))
    }
  }, [state.activeId])

  const addAttachment = useCallback(async (type: 'file' | 'url', name: string, filePath: string): Promise<Attachment | null> => {
    if (!state.activeId) return null
    const att = await window.brain.addAttachment(state.activeId, type, name, filePath)
    if (state.activeId) {
      const neighborhood = await window.brain.getNeighborhood(state.activeId)
      setState(s => ({ ...s, neighborhood }))
    }
    return att
  }, [state.activeId])

  const deleteAttachment = useCallback(async (id: string) => {
    await window.brain.deleteAttachment(id)
    if (state.activeId) {
      const neighborhood = await window.brain.getNeighborhood(state.activeId)
      setState(s => ({ ...s, neighborhood }))
    }
  }, [state.activeId])

  const pickAndAttachFile = useCallback(async () => {
    const file = await window.brain.pickFile()
    if (!file || !state.activeId) return
    await addAttachment('file', file.name, file.path)
  }, [state.activeId, addAttachment])

  return { ...state, navigate, createThought, updateThought, deleteThought, createLink, deleteLink, addAttachment, deleteAttachment, pickAndAttachFile, refreshAllThoughts }
}
