import { describe, it, expect } from 'vitest'
import { ACHIEVEMENT_CATALOG, evaluateAchievements } from './achievements'
import type { AchievementState } from './achievements'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    totalWorkouts: 0,
    totalPushups: 0,
    totalSquats: 0,
    totalSitups: 0,
    totalCardioKm: 0,
    currentStreak: 0,
    longestStreak: 0,
    consistencyScore: 0,
    rankNumber: 1,
    ...overrides,
  }
}

function getById(id: string) {
  const a = ACHIEVEMENT_CATALOG.find((a) => a.id === id)
  if (!a) throw new Error(`Achievement "${id}" not found in catalog`)
  return a
}

// ─── first-workout ────────────────────────────────────────────────────────────

describe('first-workout predicate', () => {
  const a = getById('first-workout')

  it('0 workouts → false', () => {
    expect(a.predicate(makeState({ totalWorkouts: 0 }))).toBe(false)
  })

  it('1 workout → true', () => {
    expect(a.predicate(makeState({ totalWorkouts: 1 }))).toBe(true)
  })

  it('many workouts → still true', () => {
    expect(a.predicate(makeState({ totalWorkouts: 100 }))).toBe(true)
  })
})

// ─── streak-3 ────────────────────────────────────────────────────────────────

describe('streak-3 predicate', () => {
  const a = getById('streak-3')

  it('longestStreak=2 → false', () => {
    expect(a.predicate(makeState({ longestStreak: 2 }))).toBe(false)
  })

  it('longestStreak=3 → true', () => {
    expect(a.predicate(makeState({ longestStreak: 3 }))).toBe(true)
  })

  it('remains true when currentStreak drops below 3 (uses longestStreak)', () => {
    // User had a 3-day streak but broke it; streak reset to 1
    expect(a.predicate(makeState({ longestStreak: 3, currentStreak: 1 }))).toBe(true)
  })

  it('currentStreak=2 and longestStreak=2 → false (both below threshold)', () => {
    expect(a.predicate(makeState({ longestStreak: 2, currentStreak: 2 }))).toBe(false)
  })
})

// ─── streak-7 ────────────────────────────────────────────────────────────────

describe('streak-7 predicate', () => {
  const a = getById('streak-7')

  it('longestStreak=6 → false', () => {
    expect(a.predicate(makeState({ longestStreak: 6 }))).toBe(false)
  })

  it('longestStreak=7 → true', () => {
    expect(a.predicate(makeState({ longestStreak: 7 }))).toBe(true)
  })

  it('longestStreak=3 unlocks streak-3 but not streak-7', () => {
    const s3 = getById('streak-3')
    expect(s3.predicate(makeState({ longestStreak: 3 }))).toBe(true)
    expect(a.predicate(makeState({ longestStreak: 3 }))).toBe(false)
  })
})

// ─── first-1km ───────────────────────────────────────────────────────────────

describe('first-1km predicate', () => {
  const a = getById('first-1km')

  it('0.99 km → false', () => {
    expect(a.predicate(makeState({ totalCardioKm: 0.99 }))).toBe(false)
  })

  it('1.0 km → true', () => {
    expect(a.predicate(makeState({ totalCardioKm: 1.0 }))).toBe(true)
  })

  it('0 km → false', () => {
    expect(a.predicate(makeState({ totalCardioKm: 0 }))).toBe(false)
  })

  it('well above 1 km → true', () => {
    expect(a.predicate(makeState({ totalCardioKm: 10 }))).toBe(true)
  })
})

// ─── pushups-100 ─────────────────────────────────────────────────────────────

describe('pushups-100 predicate', () => {
  const a = getById('pushups-100')

  it('99 push-ups → false', () => {
    expect(a.predicate(makeState({ totalPushups: 99 }))).toBe(false)
  })

  it('100 push-ups → true', () => {
    expect(a.predicate(makeState({ totalPushups: 100 }))).toBe(true)
  })

  it('0 push-ups → false', () => {
    expect(a.predicate(makeState({ totalPushups: 0 }))).toBe(false)
  })

  it('more than 100 → still true', () => {
    expect(a.predicate(makeState({ totalPushups: 999 }))).toBe(true)
  })
})

// ─── consistency-warrior ─────────────────────────────────────────────────────

describe('consistency-warrior predicate', () => {
  const a = getById('consistency-warrior')

  it('19 workouts + score 0.8 → false (one below workout threshold)', () => {
    expect(a.predicate(makeState({ totalWorkouts: 19, consistencyScore: 0.8 }))).toBe(false)
  })

  it('20 workouts + score 0.8 → true', () => {
    expect(a.predicate(makeState({ totalWorkouts: 20, consistencyScore: 0.8 }))).toBe(true)
  })

  it('20 workouts + score 0.79 → false (one unit below score threshold)', () => {
    expect(a.predicate(makeState({ totalWorkouts: 20, consistencyScore: 0.79 }))).toBe(false)
  })

  it('20 workouts + score 0.0 → false (no consistency)', () => {
    expect(a.predicate(makeState({ totalWorkouts: 20, consistencyScore: 0 }))).toBe(false)
  })

  it('high score but only 0 workouts → false', () => {
    expect(a.predicate(makeState({ totalWorkouts: 0, consistencyScore: 1.0 }))).toBe(false)
  })

  it('requires both gates simultaneously', () => {
    const justWorkouts = makeState({ totalWorkouts: 100, consistencyScore: 0 })
    const justScore = makeState({ totalWorkouts: 0, consistencyScore: 1.0 })
    expect(a.predicate(justWorkouts)).toBe(false)
    expect(a.predicate(justScore)).toBe(false)
  })
})

// ─── evaluateAchievements ─────────────────────────────────────────────────────

describe('evaluateAchievements — basic behaviour', () => {
  it('zero-state returns no newly unlocked achievements', () => {
    expect(evaluateAchievements([], makeState())).toHaveLength(0)
  })

  it('returns first-workout on first completed workout', () => {
    const result = evaluateAchievements([], makeState({ totalWorkouts: 1 }))
    expect(result.map((a) => a.id)).toContain('first-workout')
  })

  it('multiple achievements can unlock in a single evaluation', () => {
    const state = makeState({ totalWorkouts: 1, longestStreak: 7 })
    const ids = evaluateAchievements([], state).map((a) => a.id)
    expect(ids).toContain('first-workout')
    expect(ids).toContain('streak-3')
    expect(ids).toContain('streak-7')
  })

  it('all achievements unlock when every threshold is met', () => {
    const state = makeState({
      totalWorkouts: 20,
      totalPushups: 100,
      totalCardioKm: 1,
      longestStreak: 7,
      consistencyScore: 0.8,
    })
    const result = evaluateAchievements([], state)
    expect(result).toHaveLength(ACHIEVEMENT_CATALOG.length)
  })
})

describe('evaluateAchievements — no double-firing', () => {
  it('re-evaluation with same state never re-fires already-unlocked achievement', () => {
    const state = makeState({ totalWorkouts: 1 })

    const first = evaluateAchievements([], state)
    expect(first.map((a) => a.id)).toContain('first-workout')

    const alreadyUnlocked = first.map((a) => a.id)
    const second = evaluateAchievements(alreadyUnlocked, state)
    expect(second.map((a) => a.id)).not.toContain('first-workout')
  })

  it('already-unlocked ids are excluded even when predicate is still true', () => {
    const state = makeState({ totalWorkouts: 1, longestStreak: 7 })
    const alreadyUnlocked = ['first-workout', 'streak-7']

    const result = evaluateAchievements(alreadyUnlocked, state)
    const ids = result.map((a) => a.id)

    expect(ids).not.toContain('first-workout')
    expect(ids).not.toContain('streak-7')
    expect(ids).toContain('streak-3') // was not in alreadyUnlocked
  })

  it('idempotent: three consecutive evaluations with same state return empty after first', () => {
    const state = makeState({ totalWorkouts: 1 })

    const first = evaluateAchievements([], state).map((a) => a.id)
    const second = evaluateAchievements(first, state)
    const third = evaluateAchievements(first, state)

    expect(second).toHaveLength(0)
    expect(third).toHaveLength(0)
  })

  it('unlocking all achievements leaves nothing new on re-evaluation', () => {
    const state = makeState({
      totalWorkouts: 20,
      totalPushups: 100,
      totalCardioKm: 1,
      longestStreak: 7,
      consistencyScore: 0.8,
    })
    const allIds = evaluateAchievements([], state).map((a) => a.id)
    expect(allIds).toHaveLength(ACHIEVEMENT_CATALOG.length)

    const reEval = evaluateAchievements(allIds, state)
    expect(reEval).toHaveLength(0)
  })
})

describe('evaluateAchievements — result shape', () => {
  it('each returned definition has id, title, description, and positive xpBonus', () => {
    const state = makeState({ totalWorkouts: 1 })
    for (const a of evaluateAchievements([], state)) {
      expect(typeof a.id).toBe('string')
      expect(a.id.length).toBeGreaterThan(0)
      expect(typeof a.title).toBe('string')
      expect(typeof a.description).toBe('string')
      expect(typeof a.reward.xpBonus).toBe('number')
      expect(a.reward.xpBonus).toBeGreaterThan(0)
    }
  })
})

// ─── Catalog integrity ────────────────────────────────────────────────────────

describe('ACHIEVEMENT_CATALOG integrity', () => {
  it('contains all 6 PRD achievements', () => {
    const ids = new Set(ACHIEVEMENT_CATALOG.map((a) => a.id))
    expect(ids.has('first-workout')).toBe(true)
    expect(ids.has('streak-3')).toBe(true)
    expect(ids.has('streak-7')).toBe(true)
    expect(ids.has('first-1km')).toBe(true)
    expect(ids.has('pushups-100')).toBe(true)
    expect(ids.has('consistency-warrior')).toBe(true)
  })

  it('all ids are unique', () => {
    const ids = ACHIEVEMENT_CATALOG.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all xpBonus values are positive', () => {
    for (const a of ACHIEVEMENT_CATALOG) {
      expect(a.reward.xpBonus).toBeGreaterThan(0)
    }
  })

  it('all predicates are callable functions', () => {
    const state = makeState()
    for (const a of ACHIEVEMENT_CATALOG) {
      expect(() => a.predicate(state)).not.toThrow()
      expect(typeof a.predicate(state)).toBe('boolean')
    }
  })
})
