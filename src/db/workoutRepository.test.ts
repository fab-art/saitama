import { describe, it, expect, beforeEach } from 'vitest'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { HeroPathDb } from './schema'
import { makeWorkoutRepository } from './workoutRepository'
import type { Workout } from '@/domain/types'

function makeDb() {
  return new HeroPathDb({ indexedDB: new IDBFactory(), IDBKeyRange })
}

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'w1',
    date: '2026-01-01',
    pushups: 10,
    squats: 10,
    situps: 10,
    cardioKm: 1,
    ...overrides,
  }
}

describe('workoutRepository — add / getById', () => {
  it('round-trips a workout via add then getById', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    const w = makeWorkout()
    await repo.add(w)
    expect(await repo.getById('w1')).toEqual(w)
  })

  it('getById returns null for unknown id', async () => {
    const repo = makeWorkoutRepository(makeDb())
    expect(await repo.getById('missing')).toBeNull()
  })

  it('add overwrites an existing entry with the same id', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ pushups: 10 }))
    await repo.add(makeWorkout({ pushups: 99 }))
    const stored = await repo.getById('w1')
    expect(stored?.pushups).toBe(99)
  })
})

describe('workoutRepository — getByDate', () => {
  it('returns workouts matching the given date', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'a', date: '2026-01-01' }))
    await repo.add(makeWorkout({ id: 'b', date: '2026-01-02' }))
    const results = await repo.getByDate('2026-01-01')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('a')
  })

  it('returns empty array when no workouts exist for that date', async () => {
    const repo = makeWorkoutRepository(makeDb())
    expect(await repo.getByDate('2026-06-15')).toHaveLength(0)
  })

  it('returns multiple workouts on the same date', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'x', date: '2026-03-10' }))
    await repo.add(makeWorkout({ id: 'y', date: '2026-03-10' }))
    expect(await repo.getByDate('2026-03-10')).toHaveLength(2)
  })
})

describe('workoutRepository — getWorkoutsByDateRange', () => {
  let db: HeroPathDb

  beforeEach(() => {
    db = makeDb()
  })

  it('returns workouts within the range (inclusive)', async () => {
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'a', date: '2026-01-01' }))
    await repo.add(makeWorkout({ id: 'b', date: '2026-01-05' }))
    await repo.add(makeWorkout({ id: 'c', date: '2026-01-10' }))
    const results = await repo.getWorkoutsByDateRange('2026-01-01', '2026-01-10')
    expect(results).toHaveLength(3)
  })

  it('includes boundary dates (inclusive on both ends)', async () => {
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'start', date: '2026-02-01' }))
    await repo.add(makeWorkout({ id: 'end', date: '2026-02-28' }))
    const ids = (await repo.getWorkoutsByDateRange('2026-02-01', '2026-02-28')).map(
      (w) => w.id,
    )
    expect(ids).toContain('start')
    expect(ids).toContain('end')
  })

  it('excludes workouts outside the range', async () => {
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'before', date: '2025-12-31' }))
    await repo.add(makeWorkout({ id: 'inside', date: '2026-01-15' }))
    await repo.add(makeWorkout({ id: 'after', date: '2026-02-01' }))
    const ids = (await repo.getWorkoutsByDateRange('2026-01-01', '2026-01-31')).map(
      (w) => w.id,
    )
    expect(ids).not.toContain('before')
    expect(ids).not.toContain('after')
    expect(ids).toContain('inside')
  })

  it('returns empty array for range with no workouts', async () => {
    const repo = makeWorkoutRepository(db)
    expect(await repo.getWorkoutsByDateRange('2030-01-01', '2030-01-31')).toHaveLength(0)
  })
})

describe('workoutRepository — aggregate totals', () => {
  it('getTotalPushups sums across all workouts (30 + 70 = 100)', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'a', pushups: 30 }))
    await repo.add(makeWorkout({ id: 'b', pushups: 70 }))
    expect(await repo.getTotalPushups()).toBe(100)
  })

  it('getTotalSquats sums correctly', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'a', squats: 15 }))
    await repo.add(makeWorkout({ id: 'b', squats: 25 }))
    expect(await repo.getTotalSquats()).toBe(40)
  })

  it('getTotalSitups sums correctly', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'a', situps: 20 }))
    await repo.add(makeWorkout({ id: 'b', situps: 30 }))
    expect(await repo.getTotalSitups()).toBe(50)
  })

  it('getTotalCardioKm sums correctly', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'a', cardioKm: 1.5 }))
    await repo.add(makeWorkout({ id: 'b', cardioKm: 3.5 }))
    expect(await repo.getTotalCardioKm()).toBeCloseTo(5.0, 5)
  })

  it('returns 0 for all aggregates on empty DB', async () => {
    const repo = makeWorkoutRepository(makeDb())
    expect(await repo.getTotalPushups()).toBe(0)
    expect(await repo.getTotalSquats()).toBe(0)
    expect(await repo.getTotalSitups()).toBe(0)
    expect(await repo.getTotalCardioKm()).toBe(0)
  })
})

describe('workoutRepository — getAll / delete', () => {
  it('getAll returns all stored workouts', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'a' }))
    await repo.add(makeWorkout({ id: 'b' }))
    expect(await repo.getAll()).toHaveLength(2)
  })

  it('getAll returns empty array on empty DB', async () => {
    expect(await makeWorkoutRepository(makeDb()).getAll()).toHaveLength(0)
  })

  it('delete removes the workout', async () => {
    const db = makeDb()
    const repo = makeWorkoutRepository(db)
    await repo.add(makeWorkout({ id: 'x' }))
    await repo.delete('x')
    expect(await repo.getById('x')).toBeNull()
  })

  it('delete of non-existent id does not throw', async () => {
    const repo = makeWorkoutRepository(makeDb())
    await expect(repo.delete('ghost')).resolves.toBeUndefined()
  })
})
