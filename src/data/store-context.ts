import { createContext, useContext } from 'react'
import type { Action } from '../domain/reducer.ts'
import type { AppData } from '../domain/types.ts'

export interface Store {
  data: AppData
  /** Applies an action. Returns an error message when it is rejected, otherwise null. */
  dispatch: (action: Action) => string | null
  /** Replaces everything with the demo data. */
  loadSample: () => void
  /** Replaces everything with an empty dataset. */
  clearAll: () => void
  /** Validates and imports an exported JSON file. Returns an error message or null. */
  importJson: (text: string) => string | null
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}
