export interface Thought {
  id: string
  title: string
  notes: string
  color: string
  type_id: string | null
  created_at: number
  updated_at: number
}

export interface Link {
  id: string
  source_id: string
  target_id: string
  type: 'child' | 'jump'
  label: string
  is_one_way: number  // 0 = bidirectional, 1 = source→target only
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

export interface Tag {
  id: string
  name: string
  color: string
  created_at: number
}

export interface ThoughtType {
  id: string
  name: string
  color: string
  super_type_id: string | null
  created_at: number
}

export interface Neighborhood {
  thought: Thought
  parents: Thought[]
  children: Thought[]
  jumps: Thought[]
  siblings: Thought[]
  links: Link[]
  attachments: Attachment[]
  tags: Tag[]
  backlinks: Thought[]
}

export interface FilePreviewData {
  type: 'image' | 'pdf' | 'text' | 'unknown'
  dataUrl?: string
  text?: string
}

export interface IndexStatus {
  indexed: number   // thoughts that have embeddings
  total: number     // all thoughts
  loading: boolean  // model is still initializing / downloading
}

export interface ThoughtWithScore extends Thought {
  score: number     // 0–100 similarity score
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
  UPDATE_LINK: 'update-link',
  ADD_ATTACHMENT: 'add-attachment',
  DELETE_ATTACHMENT: 'delete-attachment',
  CREATE_TAG: 'create-tag',
  GET_ALL_TAGS: 'get-all-tags',
  ADD_TAG_TO_THOUGHT: 'add-tag-to-thought',
  REMOVE_TAG_FROM_THOUGHT: 'remove-tag-from-thought',
  CREATE_TYPE: 'create-type',
  GET_ALL_TYPES: 'get-all-types',
  PICK_FILE: 'pick-file',
  OPEN_FILE: 'open-file',
  READ_FILE_PREVIEW: 'read-file-preview',
  SEMANTIC_SEARCH: 'semantic-search',
  GET_INDEX_STATUS: 'get-index-status',
  INDEX_PROGRESS: 'index:progress'
} as const
