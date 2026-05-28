import type { Workout } from '@/domain/types'
import type { HeroPathDb } from './schema'
import { PersistenceError } from './errors'

export type WorkoutRepository = {
  add(workout: Workout): Promise<void>
  getById(id: string): Promise<Workout | null>
  getByDate(date: string): Promise<Workout[]>
  getWorkoutsByDateRange(from: string, to: string): Promise<Workout[]>
  getAll(): Promise<Workout[]>
  delete(id: string): Promise<void>
  getTotalPushups(): Promise<number>
  getTotalSquats(): Promise<number>
  getTotalSitups(): Promise<number>
  getTotalCardioKm(): Promise<number>
}

export function makeWorkoutRepository(db: HeroPathDb): WorkoutRepository {
  return {
    async add(workout) {
      try {
        await db.workouts.put(workout)
      } catch (err) {
        throw new PersistenceError('write_failed', 'Failed to save workout', err)
      }
    },

    async getById(id) {
      try {
        return (await db.workouts.get(id)) ?? null
      } catch (err) {
        throw new PersistenceError('read_failed', `Failed to get workout ${id}`, err)
      }
    },

    async getByDate(date) {
      try {
        return await db.workouts.where('date').equals(date).toArray()
      } catch (err) {
        throw new PersistenceError('read_failed', `Failed to get workouts for ${date}`, err)
      }
    },

    async getWorkoutsByDateRange(from, to) {
      try {
        return await db.workouts.where('date').between(from, to, true, true).toArray()
      } catch (err) {
        throw new PersistenceError('read_failed', `Failed to get workouts in range ${from}–${to}`, err)
      }
    },

    async getAll() {
      try {
        return await db.workouts.toArray()
      } catch (err) {
        throw new PersistenceError('read_failed', 'Failed to get all workouts', err)
      }
    },

    async delete(id) {
      try {
        await db.workouts.delete(id)
      } catch (err) {
        throw new PersistenceError('write_failed', `Failed to delete workout ${id}`, err)
      }
    },

    async getTotalPushups() {
      try {
        const all = await db.workouts.toArray()
        return all.reduce((sum, w) => sum + w.pushups, 0)
      } catch (err) {
        throw new PersistenceError('read_failed', 'Failed to compute total push-ups', err)
      }
    },

    async getTotalSquats() {
      try {
        const all = await db.workouts.toArray()
        return all.reduce((sum, w) => sum + w.squats, 0)
      } catch (err) {
        throw new PersistenceError('read_failed', 'Failed to compute total squats', err)
      }
    },

    async getTotalSitups() {
      try {
        const all = await db.workouts.toArray()
        return all.reduce((sum, w) => sum + w.situps, 0)
      } catch (err) {
        throw new PersistenceError('read_failed', 'Failed to compute total sit-ups', err)
      }
    },

    async getTotalCardioKm() {
      try {
        const all = await db.workouts.toArray()
        return all.reduce((sum, w) => sum + w.cardioKm, 0)
      } catch (err) {
        throw new PersistenceError('read_failed', 'Failed to compute total cardio km', err)
      }
    },
  }
}

let _instance: WorkoutRepository | null = null

export function getWorkoutRepository(db: HeroPathDb): WorkoutRepository {
  if (!_instance) _instance = makeWorkoutRepository(db)
  return _instance
}
