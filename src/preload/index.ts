import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { Thought, Link, Attachment, Neighborhood, FilePreviewData } from '../shared/types'

const brain = {
  createThought: (title: string, color?: string): Promise<Thought> => ipcRenderer.invoke(IPC.CREATE_THOUGHT, title, color),
  getThought: (id: string): Promise<Thought | undefined> => ipcRenderer.invoke(IPC.GET_THOUGHT, id),
  updateThought: (id: string, patch: Partial<Omit<Thought, 'id' | 'created_at'>>): Promise<void> => ipcRenderer.invoke(IPC.UPDATE_THOUGHT, id, patch),
  deleteThought: (id: string): Promise<void> => ipcRenderer.invoke(IPC.DELETE_THOUGHT, id),
  getAllThoughts: (): Promise<Thought[]> => ipcRenderer.invoke(IPC.GET_ALL_THOUGHTS),
  getNeighborhood: (id: string): Promise<Neighborhood> => ipcRenderer.invoke(IPC.GET_NEIGHBORHOOD, id),
  searchThoughts: (query: string): Promise<Thought[]> => ipcRenderer.invoke(IPC.SEARCH_THOUGHTS, query),
  createLink: (sourceId: string, targetId: string, type: 'child' | 'jump'): Promise<Link> => ipcRenderer.invoke(IPC.CREATE_LINK, sourceId, targetId, type),
  deleteLink: (id: string): Promise<void> => ipcRenderer.invoke(IPC.DELETE_LINK, id),
  getAllLinks: (): Promise<Link[]> => ipcRenderer.invoke(IPC.GET_ALL_LINKS),
  addAttachment: (thoughtId: string, type: 'file' | 'url', name: string, path: string): Promise<Attachment> => ipcRenderer.invoke(IPC.ADD_ATTACHMENT, thoughtId, type, name, path),
  deleteAttachment: (id: string): Promise<void> => ipcRenderer.invoke(IPC.DELETE_ATTACHMENT, id),
  pickFile: (): Promise<{ name: string; path: string } | null> => ipcRenderer.invoke(IPC.PICK_FILE),
  openFile: (path: string): Promise<void> => ipcRenderer.invoke(IPC.OPEN_FILE, path),
  readFilePreview: (path: string): Promise<FilePreviewData> => ipcRenderer.invoke(IPC.READ_FILE_PREVIEW, path),
  onMenuNewThought: (cb: () => void) => { ipcRenderer.on('menu:new-thought', cb); return () => ipcRenderer.off('menu:new-thought', cb) },
  onMenuFocusSearch: (cb: () => void) => { ipcRenderer.on('menu:focus-search', cb); return () => ipcRenderer.off('menu:focus-search', cb) }
}

contextBridge.exposeInMainWorld('brain', brain)
export type BrainAPI = typeof brain
