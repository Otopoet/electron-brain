import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { Thought, Link, Attachment, Neighborhood, FilePreviewData, Tag, ThoughtType, LinkType, IndexStatus, ThoughtWithScore } from '../shared/types'

const brain = {
  // Thoughts
  createThought: (title: string, color?: string): Promise<Thought> => ipcRenderer.invoke(IPC.CREATE_THOUGHT, title, color),
  getThought: (id: string): Promise<Thought | undefined> => ipcRenderer.invoke(IPC.GET_THOUGHT, id),
  updateThought: (id: string, patch: Partial<Omit<Thought, 'id' | 'created_at'>>): Promise<void> => ipcRenderer.invoke(IPC.UPDATE_THOUGHT, id, patch),
  deleteThought: (id: string): Promise<void> => ipcRenderer.invoke(IPC.DELETE_THOUGHT, id),
  getAllThoughts: (): Promise<Thought[]> => ipcRenderer.invoke(IPC.GET_ALL_THOUGHTS),
  getNeighborhood: (id: string): Promise<Neighborhood> => ipcRenderer.invoke(IPC.GET_NEIGHBORHOOD, id),
  searchThoughts: (query: string): Promise<Thought[]> => ipcRenderer.invoke(IPC.SEARCH_THOUGHTS, query),

  // Pin
  togglePin: (id: string): Promise<Thought> => ipcRenderer.invoke(IPC.TOGGLE_PIN_THOUGHT, id),
  getPinnedThoughts: (): Promise<Thought[]> => ipcRenderer.invoke(IPC.GET_PINNED_THOUGHTS),

  // Links
  createLink: (sourceId: string, targetId: string, type: 'child' | 'jump', label?: string, isOneWay?: number, color?: string, width?: number, linkTypeId?: string): Promise<Link> =>
    ipcRenderer.invoke(IPC.CREATE_LINK, sourceId, targetId, type, label, isOneWay, color, width, linkTypeId),
  updateLink: (id: string, patch: { label?: string; is_one_way?: number; color?: string; width?: number; link_type_id?: string | null }): Promise<void> => ipcRenderer.invoke(IPC.UPDATE_LINK, id, patch),
  deleteLink: (id: string): Promise<void> => ipcRenderer.invoke(IPC.DELETE_LINK, id),
  getAllLinks: (): Promise<Link[]> => ipcRenderer.invoke(IPC.GET_ALL_LINKS),

  // Link types
  createLinkType: (name: string, color: string, width: number): Promise<LinkType> => ipcRenderer.invoke(IPC.CREATE_LINK_TYPE, name, color, width),
  getAllLinkTypes: (): Promise<LinkType[]> => ipcRenderer.invoke(IPC.GET_ALL_LINK_TYPES),
  deleteLinkType: (id: string): Promise<void> => ipcRenderer.invoke(IPC.DELETE_LINK_TYPE, id),

  // Attachments
  addAttachment: (thoughtId: string, type: 'file' | 'url', name: string, path: string): Promise<Attachment> =>
    ipcRenderer.invoke(IPC.ADD_ATTACHMENT, thoughtId, type, name, path),
  deleteAttachment: (id: string): Promise<void> => ipcRenderer.invoke(IPC.DELETE_ATTACHMENT, id),

  // Tags
  createTag: (name: string, color: string): Promise<Tag> => ipcRenderer.invoke(IPC.CREATE_TAG, name, color),
  getAllTags: (): Promise<Tag[]> => ipcRenderer.invoke(IPC.GET_ALL_TAGS),
  addTagToThought: (thoughtId: string, tagId: string): Promise<void> => ipcRenderer.invoke(IPC.ADD_TAG_TO_THOUGHT, thoughtId, tagId),
  removeTagFromThought: (thoughtId: string, tagId: string): Promise<void> => ipcRenderer.invoke(IPC.REMOVE_TAG_FROM_THOUGHT, thoughtId, tagId),

  // Types
  createType: (name: string, color: string, icon?: string): Promise<ThoughtType> => ipcRenderer.invoke(IPC.CREATE_TYPE, name, color, icon),
  getAllTypes: (): Promise<ThoughtType[]> => ipcRenderer.invoke(IPC.GET_ALL_TYPES),

  // File system
  pickFile: (): Promise<{ name: string; path: string } | null> => ipcRenderer.invoke(IPC.PICK_FILE),
  openFile: (path: string): Promise<void> => ipcRenderer.invoke(IPC.OPEN_FILE, path),
  readFilePreview: (path: string): Promise<FilePreviewData> => ipcRenderer.invoke(IPC.READ_FILE_PREVIEW, path),

  // Semantic search
  semanticSearch: (query: string, topK?: number): Promise<ThoughtWithScore[]> =>
    ipcRenderer.invoke(IPC.SEMANTIC_SEARCH, query, topK),
  getIndexStatus: (): Promise<IndexStatus> => ipcRenderer.invoke(IPC.GET_INDEX_STATUS),

  // Menu events
  onMenuNewThought: (cb: () => void) => { ipcRenderer.on('menu:new-thought', cb); return () => ipcRenderer.off('menu:new-thought', cb) },
  onMenuFocusSearch: (cb: () => void) => { ipcRenderer.on('menu:focus-search', cb); return () => ipcRenderer.off('menu:focus-search', cb) },

  // Index progress events (main → renderer)
  onIndexProgress: (cb: (status: IndexStatus) => void) => {
    const handler = (_: Electron.IpcRendererEvent, status: IndexStatus) => cb(status)
    ipcRenderer.on(IPC.INDEX_PROGRESS, handler)
    return () => ipcRenderer.off(IPC.INDEX_PROGRESS, handler)
  }
}

contextBridge.exposeInMainWorld('brain', brain)
export type BrainAPI = typeof brain
