import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import { parseAppData } from '../domain/parse.ts'
import { apply, emptyData } from '../domain/reducer.ts'
import type { Action } from '../domain/reducer.ts'
import { seedData } from '../domain/seed.ts'
import type { AppData } from '../domain/types.ts'
import { localStorageRepository, STORAGE_KEY } from './repository.ts'
import type { Repository } from './repository.ts'
import { StoreContext } from './store-context.ts'
import type { Store } from './store-context.ts'

const reduce = (data: AppData, action: Action) => apply(data, action).data

export function StoreProvider({
  children,
  repository = localStorageRepository,
}: {
  children: ReactNode
  repository?: Repository
}) {
  const [data, rawDispatch] = useReducer(reduce, repository, (repo) => repo.load() ?? seedData())

  // Validation needs the latest state synchronously, before React re-renders.
  const latest = useRef(data)
  useEffect(() => {
    latest.current = data
    repository.save(data)
  }, [repository, data])

  // Another tab wrote new data: adopt it instead of overwriting it later.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const next = repository.load()
      if (next) rawDispatch({ type: 'data/replace', data: next })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [repository])

  const dispatch = useCallback((action: Action) => {
    const result = apply(latest.current, action)
    if (result.error) return result.error
    latest.current = result.data
    rawDispatch(action)
    return null
  }, [])

  const store = useMemo<Store>(
    () => ({
      data,
      dispatch,
      loadSample: () => dispatch({ type: 'data/replace', data: seedData() }),
      clearAll: () => dispatch({ type: 'data/replace', data: emptyData() }),
      importJson: (text) => {
        let raw: unknown
        try {
          raw = JSON.parse(text)
        } catch {
          return 'Dosya geçerli bir JSON değil.'
        }
        const parsed = parseAppData(raw)
        return parsed.error ?? dispatch({ type: 'data/replace', data: parsed.data })
      },
    }),
    [data, dispatch],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
