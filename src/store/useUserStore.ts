import { create } from 'zustand'
import type { User } from '@/domain/types'
import { db, getUserRepository } from '@/db'
import type { UserRepository } from '@/db'

type UserState = {
  user: User | null
  isLoading: boolean
}

type UserActions = {
  init(): Promise<void>
  setUser(user: User): void
  createUser(username: string): Promise<void>
}

export type UserStore = UserState & UserActions

type Deps = {
  userRepo: UserRepository
}

export function createUserStore(deps: Deps) {
  return create<UserStore>()((set) => ({
    user: null,
    isLoading: false,

    async init() {
      set({ isLoading: true })
      try {
        const user = await deps.userRepo.get()
        set({ user, isLoading: false })
      } catch {
        set({ isLoading: false })
      }
    },

    setUser(user) {
      set({ user })
    },

    async createUser(username) {
      const newUser: User = {
        id: crypto.randomUUID(),
        username,
        level: 1,
        xp: 0,
        rank: 1,
        streak: 0,
        longestStreak: 0,
      }
      await deps.userRepo.upsert(newUser)
      set({ user: newUser })
    },
  }))
}

export const useUserStore = createUserStore({
  userRepo: getUserRepository(db),
})
