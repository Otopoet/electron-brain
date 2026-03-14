import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Thought, Link, Attachment, Neighborhood } from '../shared/types'

let db: Database.Database

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'brain.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createSchema()
}

function createSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS thoughts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT DEFAULT '',
      color TEXT DEFAULT '#4A90E2',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'child',
      created_at INTEGER NOT NULL,
      FOREIGN KEY(source_id) REFERENCES thoughts(id) ON DELETE CASCADE,
      FOREIGN KEY(target_id) REFERENCES thoughts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      thought_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(thought_id) REFERENCES thoughts(id) ON DELETE CASCADE
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS thoughts_fts USING fts5(
      title,
      notes,
      content=thoughts,
      content_rowid=rowid
    );

    CREATE TRIGGER IF NOT EXISTS thoughts_ai AFTER INSERT ON thoughts BEGIN
      INSERT INTO thoughts_fts(rowid, title, notes) VALUES (new.rowid, new.title, new.notes);
    END;
    CREATE TRIGGER IF NOT EXISTS thoughts_ad AFTER DELETE ON thoughts BEGIN
      INSERT INTO thoughts_fts(thoughts_fts, rowid, title, notes) VALUES('delete', old.rowid, old.title, old.notes);
    END;
    CREATE TRIGGER IF NOT EXISTS thoughts_au AFTER UPDATE ON thoughts BEGIN
      INSERT INTO thoughts_fts(thoughts_fts, rowid, title, notes) VALUES('delete', old.rowid, old.title, old.notes);
      INSERT INTO thoughts_fts(rowid, title, notes) VALUES (new.rowid, new.title, new.notes);
    END;
  `)
}

export function dbCreateThought(title: string, color?: string): Thought {
  const now = Date.now()
  const thought: Thought = {
    id: uuidv4(),
    title,
    notes: '',
    color: color ?? '#4A90E2',
    created_at: now,
    updated_at: now
  }
  db.prepare(
    'INSERT INTO thoughts (id, title, notes, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(thought.id, thought.title, thought.notes, thought.color, thought.created_at, thought.updated_at)
  return thought
}

export function dbGetThought(id: string): Thought | undefined {
  return db.prepare('SELECT * FROM thoughts WHERE id = ?').get(id) as Thought | undefined
}

export function dbUpdateThought(id: string, patch: Partial<Omit<Thought, 'id' | 'created_at'>>): void {
  const fields = Object.entries(patch).map(([k]) => `${k} = ?`).join(', ')
  const values = Object.values(patch)
  db.prepare(`UPDATE thoughts SET ${fields}, updated_at = ? WHERE id = ?`).run(...values, Date.now(), id)
}

export function dbDeleteThought(id: string): void {
  db.prepare('DELETE FROM thoughts WHERE id = ?').run(id)
}

export function dbGetAllThoughts(): Thought[] {
  return db.prepare('SELECT * FROM thoughts ORDER BY updated_at DESC').all() as Thought[]
}

export function dbSearchThoughts(query: string): Thought[] {
  const escaped = query.replace(/['"*]/g, ' ')
  return db.prepare(
    `SELECT t.* FROM thoughts t JOIN thoughts_fts fts ON t.rowid = fts.rowid WHERE thoughts_fts MATCH ? ORDER BY rank`
  ).all(escaped + '*') as Thought[]
}

export function dbGetNeighborhood(id: string): Neighborhood {
  const thought = dbGetThought(id)
  if (!thought) throw new Error(`Thought ${id} not found`)

  const parents = db.prepare(
    `SELECT t.* FROM thoughts t JOIN links l ON l.source_id = t.id WHERE l.target_id = ? AND l.type = 'child'`
  ).all(id) as Thought[]

  const children = db.prepare(
    `SELECT t.* FROM thoughts t JOIN links l ON l.target_id = t.id WHERE l.source_id = ? AND l.type = 'child'`
  ).all(id) as Thought[]

  const jumps = db.prepare(
    `SELECT t.* FROM thoughts t JOIN links l ON (l.source_id = t.id OR l.target_id = t.id)
     WHERE (l.source_id = ? OR l.target_id = ?) AND l.type = 'jump' AND t.id != ?`
  ).all(id, id, id) as Thought[]

  const links = db.prepare(
    `SELECT l.* FROM links l WHERE l.source_id = ? OR l.target_id = ?`
  ).all(id, id) as Link[]

  const attachments = db.prepare(
    'SELECT * FROM attachments WHERE thought_id = ? ORDER BY created_at DESC'
  ).all(id) as Attachment[]

  return { thought, parents, children, jumps, links, attachments }
}

export function dbCreateLink(sourceId: string, targetId: string, type: 'child' | 'jump'): Link {
  const link: Link = { id: uuidv4(), source_id: sourceId, target_id: targetId, type, created_at: Date.now() }
  db.prepare('INSERT INTO links (id, source_id, target_id, type, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(link.id, link.source_id, link.target_id, link.type, link.created_at)
  return link
}

export function dbDeleteLink(id: string): void {
  db.prepare('DELETE FROM links WHERE id = ?').run(id)
}

export function dbGetAllLinks(): Link[] {
  return db.prepare('SELECT * FROM links').all() as Link[]
}

export function dbAddAttachment(thoughtId: string, type: 'file' | 'url', name: string, filePath: string): Attachment {
  const att: Attachment = { id: uuidv4(), thought_id: thoughtId, type, name, path: filePath, created_at: Date.now() }
  db.prepare('INSERT INTO attachments (id, thought_id, type, name, path, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(att.id, att.thought_id, att.type, att.name, att.path, att.created_at)
  return att
}

export function dbDeleteAttachment(id: string): void {
  db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
}
