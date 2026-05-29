import { describe, it, expect } from 'vitest'
import { xpForLevel, levelFromTotalXp, calculateWorkoutXp } from './xp'
import type { WorkoutExercise } from './types'

// ─── xpForLevel ──────────────────────────────────────────────────────────────

describe('xpForLevel', () => {
  it('level 1 requires 0 XP', () => {
    expect(xpForLevel(1)).toBe(0)
  })

  it('level 0 returns 0 (below minimum)', () => {
    expect(xpForLevel(0)).toBe(0)
  })

  it('negative level returns 0', () => {
    expect(xpForLevel(-10)).toBe(0)
  })

  it('level 2 requires 200 XP — anchored to one workout', () => {
    // floor(200 * (2-1)^1.6) = floor(200 * 1) = 200
    expect(xpForLevel(2)).toBe(200)
  })

  it('is strictly monotonically increasing for levels 2 through 50', () => {
    for (let level = 2; level <= 50; level++) {
      expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level))
    }
  })

  it('grows super-linearly — gaps between consecutive levels widen', () => {
    const gap23 = xpForLevel(3) - xpForLevel(2)
    const gap45 = xpForLevel(5) - xpForLevel(4)
    const gap910 = xpForLevel(10) - xpForLevel(9)
    expect(gap45).toBeGreaterThan(gap23)
    expect(gap910).toBeGreaterThan(gap45)
  })

  it('level 10 threshold is significantly higher than 5× level 2 threshold', () => {
    expect(xpForLevel(10)).toBeGreaterThan(5 * xpForLevel(2))
  })

  it('returns a whole number (no fractional XP)', () => {
    for (let level = 1; level <= 20; level++) {
      expect(Number.isInteger(xpForLevel(level))).toBe(true)
    }
  })
})

// ─── levelFromTotalXp ────────────────────────────────────────────────────────

describe('levelFromTotalXp', () => {
  it('0 XP → level 1', () => {
    expect(levelFromTotalXp(0)).toBe(1)
  })

  it('negative XP → level 1', () => {
    expect(levelFromTotalXp(-500)).toBe(1)
  })

  it('exactly at the level 2 threshold → level 2', () => {
    expect(levelFromTotalXp(xpForLevel(2))).toBe(2)
  })

  it('one XP below the level 2 threshold → still level 1', () => {
    expect(levelFromTotalXp(xpForLevel(2) - 1)).toBe(1)
  })

  it('exactly at the level 3 threshold → level 3', () => {
    expect(levelFromTotalXp(xpForLevel(3))).toBe(3)
  })

  it('one XP below the level 3 threshold → level 2', () => {
    expect(levelFromTotalXp(xpForLevel(3) - 1)).toBe(2)
  })

  it('boundary round-trip: levelFromTotalXp(xpForLevel(n)) === n for levels 1–30', () => {
    for (let level = 1; level <= 30; level++) {
      expect(levelFromTotalXp(xpForLevel(level))).toBe(level)
    }
  })

  it('one-below-threshold round-trip: one XP short never reaches that level (levels 2–30)', () => {
    for (let level = 2; level <= 30; level++) {
      expect(levelFromTotalXp(xpForLevel(level) - 1)).toBe(level - 1)
    }
  })

  it('is non-decreasing — more XP never lowers your level', () => {
    let prev = levelFromTotalXp(0)
    for (let xp = 50; xp <= 10_000; xp += 50) {
      const current = levelFromTotalXp(xp)
      expect(current).toBeGreaterThanOrEqual(prev)
      prev = current
    }
  })

  it('never returns a value less than 1', () => {
    expect(levelFromTotalXp(0)).toBeGreaterThanOrEqual(1)
    expect(levelFromTotalXp(-9999)).toBeGreaterThanOrEqual(1)
  })
})

// ─── calculateWorkoutXp ──────────────────────────────────────────────────────

const TARGET: WorkoutExercise = { pushups: 20, squats: 20, situps: 20, cardioKm: 2 }

const ZERO: WorkoutExercise = { pushups: 0, squats: 0, situps: 0, cardioKm: 0 }
const HALF: WorkoutExercise = { pushups: 10, squats: 10, situps: 10, cardioKm: 1 }
const EXACT: WorkoutExercise = { pushups: 20, squats: 20, situps: 20, cardioKm: 2 }
const OVER: WorkoutExercise = { pushups: 40, squats: 40, situps: 40, cardioKm: 4 }

describe('calculateWorkoutXp — base XP (proportional to completion)', () => {
  it('zero workout → base 0', () => {
    const { base } = calculateWorkoutXp(ZERO, TARGET, { streakDays: 0 })
    expect(base).toBe(0)
  })

  it('50 % completion → base 50', () => {
    const { base } = calculateWorkoutXp(HALF, TARGET, { streakDays: 0 })
    expect(base).toBe(50)
  })

  it('100 % completion → base 100', () => {
    const { base } = calculateWorkoutXp(EXACT, TARGET, { streakDays: 0 })
    expect(base).toBe(100)
  })

  it('exceeding targets caps base at 100 — no intensity reward beyond target', () => {
    const { base } = calculateWorkoutXp(OVER, TARGET, { streakDays: 0 })
    expect(base).toBe(100)
  })

  it('partial completion still awards positive base XP', () => {
    const quarter: WorkoutExercise = { pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 }
    const { base } = calculateWorkoutXp(quarter, TARGET, { streakDays: 0 })
    expect(base).toBeGreaterThan(0)
    expect(base).toBeLessThan(100)
  })

  it('base is always a whole number', () => {
    const { base } = calculateWorkoutXp(HALF, TARGET, { streakDays: 0 })
    expect(Number.isInteger(base)).toBe(true)
  })
})

describe('calculateWorkoutXp — perfect bonus', () => {
  it('exact completion grants perfect bonus of 50', () => {
    const { perfectBonus } = calculateWorkoutXp(EXACT, TARGET, { streakDays: 0 })
    expect(perfectBonus).toBe(50)
  })

  it('exceeding targets also grants perfect bonus', () => {
    const { perfectBonus } = calculateWorkoutXp(OVER, TARGET, { streakDays: 0 })
    expect(perfectBonus).toBe(50)
  })

  it('partial completion grants no perfect bonus', () => {
    const { perfectBonus } = calculateWorkoutXp(HALF, TARGET, { streakDays: 0 })
    expect(perfectBonus).toBe(0)
  })

  it('missing one exercise by any amount forfeits the bonus', () => {
    const almostPerfect: WorkoutExercise = { ...EXACT, cardioKm: 1.99 }
    const { perfectBonus } = calculateWorkoutXp(almostPerfect, TARGET, { streakDays: 0 })
    expect(perfectBonus).toBe(0)
  })

  it('zero workout grants no perfect bonus', () => {
    const { perfectBonus } = calculateWorkoutXp(ZERO, TARGET, { streakDays: 0 })
    expect(perfectBonus).toBe(0)
  })
})

describe('calculateWorkoutXp — streak bonus', () => {
  it('0 streak days → bonus 0', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 0 }).streakBonus).toBe(0)
  })

  it('2-day streak (below first tier) → bonus 0', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 2 }).streakBonus).toBe(0)
  })

  it('3-day streak → bonus 25', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 3 }).streakBonus).toBe(25)
  })

  it('6-day streak → bonus 25 (still in 3-day tier)', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 6 }).streakBonus).toBe(25)
  })

  it('7-day streak → bonus 50', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 7 }).streakBonus).toBe(50)
  })

  it('13-day streak → bonus 50 (still in 7-day tier)', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 13 }).streakBonus).toBe(50)
  })

  it('14-day streak → bonus 75', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 14 }).streakBonus).toBe(75)
  })

  it('29-day streak → bonus 75 (still in 14-day tier)', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 29 }).streakBonus).toBe(75)
  })

  it('30-day streak → bonus 100', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 30 }).streakBonus).toBe(100)
  })

  it('365-day streak → bonus 100 (capped at max tier)', () => {
    expect(calculateWorkoutXp(EXACT, TARGET, { streakDays: 365 }).streakBonus).toBe(100)
  })
})

describe('calculateWorkoutXp — achievement bonus', () => {
  it('no newAchievements option → achievementBonus 0', () => {
    const { achievementBonus } = calculateWorkoutXp(EXACT, TARGET, { streakDays: 0 })
    expect(achievementBonus).toBe(0)
  })

  it('newAchievements: 0 → achievementBonus 0', () => {
    const { achievementBonus } = calculateWorkoutXp(EXACT, TARGET, {
      streakDays: 0,
      newAchievements: 0,
    })
    expect(achievementBonus).toBe(0)
  })

  it('1 new achievement → 75 XP', () => {
    const { achievementBonus } = calculateWorkoutXp(EXACT, TARGET, {
      streakDays: 0,
      newAchievements: 1,
    })
    expect(achievementBonus).toBe(75)
  })

  it('3 new achievements → 225 XP', () => {
    const { achievementBonus } = calculateWorkoutXp(EXACT, TARGET, {
      streakDays: 0,
      newAchievements: 3,
    })
    expect(achievementBonus).toBe(225)
  })
})

describe('calculateWorkoutXp — total and breakdown integrity', () => {
  it('total always equals base + perfectBonus + streakBonus + achievementBonus', () => {
    const scenarios: Array<[WorkoutExercise, number, number]> = [
      [ZERO, 0, 0],
      [HALF, 0, 0],
      [EXACT, 7, 1],
      [OVER, 30, 2],
    ]
    for (const [workout, streakDays, newAchievements] of scenarios) {
      const r = calculateWorkoutXp(workout, TARGET, { streakDays, newAchievements })
      expect(r.total).toBe(r.base + r.perfectBonus + r.streakBonus + r.achievementBonus)
    }
  })

  it('zero workout with a streak still grants streak bonus', () => {
    const r = calculateWorkoutXp(ZERO, TARGET, { streakDays: 7 })
    expect(r.base).toBe(0)
    expect(r.streakBonus).toBe(50)
    expect(r.total).toBe(50)
  })

  it('full bonus stack: perfect workout + 30-day streak + 1 achievement = 325 XP', () => {
    // base=100, perfect=50, streak=100, achievement=75
    const r = calculateWorkoutXp(EXACT, TARGET, { streakDays: 30, newAchievements: 1 })
    expect(r.base).toBe(100)
    expect(r.perfectBonus).toBe(50)
    expect(r.streakBonus).toBe(100)
    expect(r.achievementBonus).toBe(75)
    expect(r.total).toBe(325)
  })

  it('all breakdown fields are non-negative', () => {
    const r = calculateWorkoutXp(HALF, TARGET, { streakDays: 3, newAchievements: 1 })
    expect(r.base).toBeGreaterThanOrEqual(0)
    expect(r.perfectBonus).toBeGreaterThanOrEqual(0)
    expect(r.streakBonus).toBeGreaterThanOrEqual(0)
    expect(r.achievementBonus).toBeGreaterThanOrEqual(0)
    expect(r.total).toBeGreaterThan(0)
  })
})
