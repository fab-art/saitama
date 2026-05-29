import Dexie, { type Table } from 'dexie'
import type { User, Workout, Achievement, Progression } from '@/domain/types'

export type ProgressionRow = Progression & { id: string }

export class HeroPathDb extends Dexie {
  users!: Table<User, string>
  workouts!: Table<Workout, string>
  achievements!: Table<Achievement, string>
  progression!: Table<ProgressionRow, string>

  constructor(options?: ConstructorParameters<typeof Dexie>[1]) {
    super('HeroPathDb', options)
    this.version(1).stores({
      users: 'id',
      workouts: 'id, date',
      achievements: 'id',
      progression: 'id',
    })
  }
}

export const db = new HeroPathDb()
