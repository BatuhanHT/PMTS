import { parseAppData } from '../domain/parse.ts'
import type { AppData } from '../domain/types.ts'

const KEY = 'pmts:v1'
const CORRUPT_KEY = 'pmts:v1:corrupt'

/** The only place that knows where data lives. Swap this to move off localStorage. */
export interface Repository {
  /** null when nothing is stored (or the stored value is unreadable). */
  load(): AppData | null
  save(data: AppData): void
  clear(): void
}

export const localStorageRepository: Repository = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw === null) return null
      const parsed = parseAppData(JSON.parse(raw))
      if (parsed.data) return parsed.data
      localStorage.setItem(CORRUPT_KEY, raw) // keep a copy instead of silently losing it
      return null
    } catch {
      return null
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // quota exceeded or storage blocked: keep running in memory
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}

export const STORAGE_KEY = KEY
