import type { User } from '@/domain/types'
import type { HeroPathDb } from './schema'
import { PersistenceError } from './errors'

export type UserRepository = {
  get(): Promise<User | null>
  upsert(user: User): Promise<void>
}

export function makeUserRepository(db: HeroPathDb): UserRepository {
  return {
    async get() {
      try {
        const all = await db.users.toArray()
        return all[0] ?? null
      } catch (err) {
        throw new PersistenceError('read_failed', 'Failed to get user', err)
      }
    },

    async upsert(user) {
      try {
        await db.users.put(user)
      } catch (err) {
        throw new PersistenceError('write_failed', 'Failed to upsert user', err)
      }
    },
  }
}

let _instance: UserRepository | null = null

export function getUserRepository(db: HeroPathDb): UserRepository {
  if (!_instance) _instance = makeUserRepository(db)
  return _instance
}
