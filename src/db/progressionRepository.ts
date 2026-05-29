import type { Progression } from '@/domain/types'
import type { HeroPathDb } from './schema'
import { PersistenceError } from './errors'

const PROGRESSION_ID = 'current'

export type ProgressionRepository = {
  get(): Promise<Progression | null>
  upsert(progression: Progression): Promise<void>
}

export function makeProgressionRepository(db: HeroPathDb): ProgressionRepository {
  return {
    async get() {
      try {
        const row = await db.progression.get(PROGRESSION_ID)
        if (!row) return null
        const { id: _id, ...progression } = row
        return progression
      } catch (err) {
        throw new PersistenceError('read_failed', 'Failed to get progression', err)
      }
    },

    async upsert(progression) {
      try {
        await db.progression.put({ id: PROGRESSION_ID, ...progression })
      } catch (err) {
        throw new PersistenceError('write_failed', 'Failed to upsert progression', err)
      }
    },
  }
}

let _instance: ProgressionRepository | null = null

export function getProgressionRepository(db: HeroPathDb): ProgressionRepository {
  if (!_instance) _instance = makeProgressionRepository(db)
  return _instance
}
