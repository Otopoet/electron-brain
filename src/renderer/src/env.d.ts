/// <reference types="vite/client" />

import type { BrainAPI } from '../../preload/index'

declare global {
  interface Window {
    brain: BrainAPI
  }
}
