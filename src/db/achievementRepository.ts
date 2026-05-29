import type { Achievement } from '@/domain/types'
import type { HeroPathDb } from './schema'
import { PersistenceError } from './errors'

export type AchievementRepository = {
  add(achievement: Achievement): Promise<void>
  getAll(): Promise<Achievement[]>
  getUnlockedIds(): Promise<string[]>
  isUnlocked(id: string): Promise<boolean>
}

export function makeAchievementRepository(db: HeroPathDb): AchievementRepository {
  return {
    async add(achievement) {
      try {
        await db.achievements.put(achievement)
      } catch (err) {
        throw new PersistenceError('write_failed', 'Failed to save achievement', err)
      }
    },

    async getAll() {
      try {
        return await db.achievements.toArray()
      } catch (err) {
        throw new PersistenceError('read_failed', 'Failed to get achievements', err)
      }
    },

    async getUnlockedIds() {
      try {
        const all = await db.achievements.toArray()
        return all.filter((a) => a.unlockedAt !== null).map((a) => a.id)
      } catch (err) {
        throw new PersistenceError('read_failed', 'Failed to get unlocked achievement IDs', err)
      }
    },

    async isUnlocked(id) {
      try {
        const record = await db.achievements.get(id)
        return record !== undefined && record.unlockedAt !== null
      } catch (err) {
        throw new PersistenceError('read_failed', `Failed to check achievement ${id}`, err)
      }
    },
  }
}

let _instance: AchievementRepository | null = null

export function getAchievementRepository(db: HeroPathDb): AchievementRepository {
  if (!_instance) _instance = makeAchievementRepository(db)
  return _instance
}
