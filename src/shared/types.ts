export interface Thought {
  id: string
  title: string
  notes: string
  color: string
  created_at: number
  updated_at: number
}

export interface Link {
  id: string
  source_id: string
  target_id: string
  type: 'child' | 'jump'
  created_at: number
}

export interface Attachment {
  id: string
  thought_id: string
  type: 'file' | 'url'
  name: string
  path: string
  created_at: number
}

export interface Neighborhood {
  thought: Thought
  parents: Thought[]
  children: Thought[]
  jumps: Thought[]
  links: Link[]
  attachments: Attachment[]
}

export interface FilePreviewData {
  type: 'image' | 'pdf' | 'text' | 'unknown'
  dataUrl?: string
  text?: string
}

export const IPC = {
  CREATE_THOUGHT: 'create-thought',
  GET_THOUGHT: 'get-thought',
  UPDATE_THOUGHT: 'update-thought',
  DELETE_THOUGHT: 'delete-thought',
  GET_ALL_THOUGHTS: 'get-all-thoughts',
  GET_NEIGHBORHOOD: 'get-neighborhood',
  SEARCH_THOUGHTS: 'search-thoughts',
  CREATE_LINK: 'create-link',
  DELETE_LINK: 'delete-link',
  GET_ALL_LINKS: 'get-all-links',
  ADD_ATTACHMENT: 'add-attachment',
  DELETE_ATTACHMENT: 'delete-attachment',
  PICK_FILE: 'pick-file',
  OPEN_FILE: 'open-file',
  READ_FILE_PREVIEW: 'read-file-preview'
} as const
