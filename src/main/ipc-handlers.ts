import { ipcMain, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { IPC } from '../shared/types'
import {
  dbCreateThought, dbGetThought, dbUpdateThought, dbDeleteThought,
  dbGetAllThoughts, dbGetNeighborhood, dbSearchThoughts,
  dbCreateLink, dbUpdateLink, dbDeleteLink, dbGetAllLinks,
  dbAddAttachment, dbDeleteAttachment,
  dbCreateTag, dbGetAllTags, dbAddTagToThought, dbRemoveTagFromThought,
  dbCreateType, dbGetAllTypes,
  dbTogglePin, dbGetPinnedThoughts,
  dbCreateLinkType, dbGetAllLinkTypes, dbDeleteLinkType,
  dbGetIndexStatus,
  dbGetSetting, dbSetSetting
} from './database'
import { queueThought, semanticSearch, getStatus } from './embeddings'

export function registerIpcHandlers(): void {
  // Thoughts
  ipcMain.handle(IPC.CREATE_THOUGHT, (_, title: string, color?: string) => {
    const t = dbCreateThought(title, color)
    queueThought(t.id)   // queue for background embedding
    return t
  })
  ipcMain.handle(IPC.GET_THOUGHT, (_, id: string) => dbGetThought(id))
  ipcMain.handle(IPC.UPDATE_THOUGHT, (_, id: string, patch: Record<string, unknown>) => {
    dbUpdateThought(id, patch)
    queueThought(id)     // re-embed on content change
  })
  ipcMain.handle(IPC.DELETE_THOUGHT, (_, id: string) => dbDeleteThought(id))
  ipcMain.handle(IPC.GET_ALL_THOUGHTS, () => dbGetAllThoughts())
  ipcMain.handle(IPC.GET_NEIGHBORHOOD, (_, id: string) => dbGetNeighborhood(id))
  ipcMain.handle(IPC.SEARCH_THOUGHTS, (_, query: string) => dbSearchThoughts(query))

  // Pin
  ipcMain.handle(IPC.TOGGLE_PIN_THOUGHT, (_, id: string) => dbTogglePin(id))
  ipcMain.handle(IPC.GET_PINNED_THOUGHTS, () => dbGetPinnedThoughts())

  // Semantic search
  ipcMain.handle(IPC.SEMANTIC_SEARCH, async (_, query: string, topK?: number) => {
    return semanticSearch(query, topK)
  })
  ipcMain.handle(IPC.GET_INDEX_STATUS, () => {
    const { indexed, total } = dbGetIndexStatus()
    return { ...getStatus(), indexed, total }
  })

  // Links
  ipcMain.handle(IPC.CREATE_LINK, (_, sourceId: string, targetId: string, type: 'child' | 'jump', label?: string, isOneWay?: number, color?: string, width?: number, linkTypeId?: string) =>
    dbCreateLink(sourceId, targetId, type, label, isOneWay, color, width, linkTypeId ?? null))
  ipcMain.handle(IPC.UPDATE_LINK, (_, id: string, patch: { label?: string; is_one_way?: number; color?: string; width?: number; link_type_id?: string | null }) => dbUpdateLink(id, patch))
  ipcMain.handle(IPC.DELETE_LINK, (_, id: string) => dbDeleteLink(id))
  ipcMain.handle(IPC.GET_ALL_LINKS, () => dbGetAllLinks())

  // Link types
  ipcMain.handle(IPC.CREATE_LINK_TYPE, (_, name: string, color: string, width: number) => dbCreateLinkType(name, color, width))
  ipcMain.handle(IPC.GET_ALL_LINK_TYPES, () => dbGetAllLinkTypes())
  ipcMain.handle(IPC.DELETE_LINK_TYPE, (_, id: string) => dbDeleteLinkType(id))

  // Attachments
  ipcMain.handle(IPC.ADD_ATTACHMENT, (_, thoughtId: string, type: 'file' | 'url', name: string, filePath: string) =>
    dbAddAttachment(thoughtId, type, name, filePath))
  ipcMain.handle(IPC.DELETE_ATTACHMENT, (_, id: string) => dbDeleteAttachment(id))

  // Tags
  ipcMain.handle(IPC.CREATE_TAG, (_, name: string, color: string) => dbCreateTag(name, color))
  ipcMain.handle(IPC.GET_ALL_TAGS, () => dbGetAllTags())
  ipcMain.handle(IPC.ADD_TAG_TO_THOUGHT, (_, thoughtId: string, tagId: string) => dbAddTagToThought(thoughtId, tagId))
  ipcMain.handle(IPC.REMOVE_TAG_FROM_THOUGHT, (_, thoughtId: string, tagId: string) => dbRemoveTagFromThought(thoughtId, tagId))

  // Types
  ipcMain.handle(IPC.CREATE_TYPE, (_, name: string, color: string, icon?: string) => dbCreateType(name, color, icon))
  ipcMain.handle(IPC.GET_ALL_TYPES, () => dbGetAllTypes())

  // Settings
  ipcMain.handle(IPC.GET_SETTING, (_, key: string) => dbGetSetting(key))
  ipcMain.handle(IPC.SET_SETTING, (_, key: string, value: string) => dbSetSetting(key, value))

  // File system
  ipcMain.handle(IPC.PICK_FILE, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'] })
    if (result.canceled || !result.filePaths.length) return null
    const filePath = result.filePaths[0]
    return { name: path.basename(filePath), path: filePath }
  })

  ipcMain.handle(IPC.OPEN_FILE, async (_, filePath: string) => {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      await shell.openExternal(filePath)
    } else {
      await shell.openPath(filePath)
    }
  })

  ipcMain.handle(IPC.READ_FILE_PREVIEW, async (_, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) return { type: 'unknown' }
      const ext = path.extname(filePath).toLowerCase()
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
      const textExts = ['.txt', '.md', '.json', '.js', '.ts', '.py', '.html', '.css']
      if (imageExts.includes(ext)) {
        const data = fs.readFileSync(filePath)
        const mime: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
        return { type: 'image', dataUrl: `data:${mime[ext] || 'image/png'};base64,${data.toString('base64')}` }
      }
      if (ext === '.pdf') {
        return { type: 'pdf', dataUrl: `data:application/pdf;base64,${fs.readFileSync(filePath).toString('base64')}` }
      }
      if (textExts.includes(ext)) {
        return { type: 'text', text: fs.readFileSync(filePath, 'utf-8').slice(0, 5000) }
      }
      return { type: 'unknown' }
    } catch { return { type: 'unknown' } }
  })
}
