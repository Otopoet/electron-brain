import { ipcMain, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { IPC } from '../shared/types'
import {
  dbCreateThought, dbGetThought, dbUpdateThought, dbDeleteThought,
  dbGetAllThoughts, dbGetNeighborhood, dbSearchThoughts,
  dbCreateLink, dbDeleteLink, dbGetAllLinks,
  dbAddAttachment, dbDeleteAttachment
} from './database'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.CREATE_THOUGHT, (_, title: string, color?: string) => dbCreateThought(title, color))
  ipcMain.handle(IPC.GET_THOUGHT, (_, id: string) => dbGetThought(id))
  ipcMain.handle(IPC.UPDATE_THOUGHT, (_, id: string, patch: Record<string, unknown>) => dbUpdateThought(id, patch))
  ipcMain.handle(IPC.DELETE_THOUGHT, (_, id: string) => dbDeleteThought(id))
  ipcMain.handle(IPC.GET_ALL_THOUGHTS, () => dbGetAllThoughts())
  ipcMain.handle(IPC.GET_NEIGHBORHOOD, (_, id: string) => dbGetNeighborhood(id))
  ipcMain.handle(IPC.SEARCH_THOUGHTS, (_, query: string) => dbSearchThoughts(query))
  ipcMain.handle(IPC.CREATE_LINK, (_, sourceId: string, targetId: string, type: 'child' | 'jump') => dbCreateLink(sourceId, targetId, type))
  ipcMain.handle(IPC.DELETE_LINK, (_, id: string) => dbDeleteLink(id))
  ipcMain.handle(IPC.GET_ALL_LINKS, () => dbGetAllLinks())
  ipcMain.handle(IPC.ADD_ATTACHMENT, (_, thoughtId: string, type: 'file' | 'url', name: string, filePath: string) => dbAddAttachment(thoughtId, type, name, filePath))
  ipcMain.handle(IPC.DELETE_ATTACHMENT, (_, id: string) => dbDeleteAttachment(id))

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
        const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
        return { type: 'image', dataUrl: `data:${mimeMap[ext] || 'image/png'};base64,${data.toString('base64')}` }
      }
      if (ext === '.pdf') {
        const data = fs.readFileSync(filePath)
        return { type: 'pdf', dataUrl: `data:application/pdf;base64,${data.toString('base64')}` }
      }
      if (textExts.includes(ext)) {
        return { type: 'text', text: fs.readFileSync(filePath, 'utf-8').slice(0, 5000) }
      }
      return { type: 'unknown' }
    } catch {
      return { type: 'unknown' }
    }
  })
}
