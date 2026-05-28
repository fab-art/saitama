import { describe, it, expect } from 'vitest'
import {
  computeConsistencyScore,
  computeFatigueScore,
  computeProgression,
} from './progression'
import type { ProgressionInput } from './progression'
import { getRankByNumber } from './ranks'

const CIVILIAN = getRankByNumber(1)!   // 5/5/5/0.5km
const TRAINEE = getRankByNumber(2)!    // 10/10/10/1km
const CAPED_BALDY = getRankByNumber(8)! // 100/100/100/10km

/** Fully-healthy default input — high consistency, zero fatigue. */
function makeInput(overrides: Partial<ProgressionInput> = {}): ProgressionInput {
  return {
    currentRank: CIVILIAN,
    nextRank: TRAINEE,
    progressionFactor: 0,
    completionRate: 1.0,
    streakDays: 7,
    missedWorkouts: 0,
    totalWorkoutsInWindow: 7,
    recentCompletionRates: [1.0, 1.0, 1.0, 1.0, 1.0],
    ...overrides,
  }
}

// ─── computeConsistencyScore ──────────────────────────────────────────────────

describe('computeConsistencyScore', () => {
  it('perfect inputs → score 1', () => {
    expect(computeConsistencyScore(1.0, 7, 0, 7)).toBeCloseTo(1.0, 5)
  })

  it('zero completion and no streak → low score', () => {
    expect(computeConsistencyScore(0, 0, 5, 5)).toBe(0)
  })

  it('output is always in [0, 1] for extreme inputs', () => {
    expect(computeConsistencyScore(2.0, 999, 0, 0)).toBeLessThanOrEqual(1)
    expect(computeConsistencyScore(-1, -5, 10, 10)).toBeGreaterThanOrEqual(0)
  })

  it('longer streak improves score', () => {
    const short = computeConsistencyScore(0.8, 2, 0, 7)
    const long  = computeConsistencyScore(0.8, 7, 0, 7)
    expect(long).toBeGreaterThan(short)
  })

  it('more missed workouts reduces score', () => {
    const clean = computeConsistencyScore(0.8, 7, 0, 7)
    const messy = computeConsistencyScore(0.8, 7, 4, 7)
    expect(messy).toBeLessThan(clean)
  })

  it('streak benefit saturates — streak beyond STREAK_SATURATION_DAYS adds nothing', () => {
    const atCap    = computeConsistencyScore(0.8, 7,   0, 7)
    const beyondCap = computeConsistencyScore(0.8, 100, 0, 7)
    expect(beyondCap).toBe(atCap)
  })

  it('zero total workout window treats presence as 1 (no division by zero)', () => {
    expect(() => computeConsistencyScore(0.8, 7, 0, 0)).not.toThrow()
    expect(computeConsistencyScore(0.8, 7, 0, 0)).toBeGreaterThan(0)
  })
})

// ─── computeFatigueScore ─────────────────────────────────────────────────────

describe('computeFatigueScore', () => {
  it('empty array → fatigue 0', () => {
    expect(computeFatigueScore([])).toBe(0)
  })

  it('all perfect completions → fatigue near 0', () => {
    expect(computeFatigueScore([1, 1, 1, 1, 1])).toBeLessThan(0.1)
  })

  it('all zero completions → fatigue near 1', () => {
    expect(computeFatigueScore([0, 0, 0, 0, 0])).toBeGreaterThan(0.9)
  })

  it('output is always in [0, 1] for out-of-range inputs', () => {
    expect(computeFatigueScore([1.5, 1.5])).toBeLessThanOrEqual(1)
    expect(computeFatigueScore([-0.5, -0.5])).toBeGreaterThanOrEqual(0)
  })

  it('declining trend raises fatigue above the bare average', () => {
    // Same 0.6 average; declining has most-recent = 0.3
    const stable   = computeFatigueScore([0.6, 0.6, 0.6])
    const declining = computeFatigueScore([0.3, 0.6, 0.9]) // most-recent first
    expect(declining).toBeGreaterThan(stable)
  })

  it('improving trend does not raise fatigue above stable baseline', () => {
    // Most-recent = 0.9 (better than average 0.6) — no decline penalty
    const stable    = computeFatigueScore([0.6, 0.6, 0.6])
    const improving = computeFatigueScore([0.9, 0.6, 0.3]) // most-recent first
    expect(improving).toBeLessThanOrEqual(stable)
  })
})

// ─── Safety guardrails ────────────────────────────────────────────────────────

describe('computeProgression — safety guardrails (core invariants)', () => {
  it('high fatigue → deload, regardless of consistency', () => {
    // Perfect consistency inputs, but terrible recent sessions
    const result = computeProgression(
      makeInput({ recentCompletionRates: [0.0, 0.0, 0.0] }),
    )
    expect(result.fatigueScore).toBeGreaterThanOrEqual(0.6)
    expect(result.recommendation).toBe('deload')
  })

  it('fatigue overrides good overall metrics (declining-trend edge case)', () => {
    const result = computeProgression(
      makeInput({
        completionRate: 0.9,
        streakDays: 14,
        missedWorkouts: 0,
        totalWorkoutsInWindow: 14,
        recentCompletionRates: [0.0, 0.1, 0.0], // severe recent decline
      }),
    )
    expect(result.recommendation).toBe('deload')
  })

  it('low consistency → hold, not progress', () => {
    const result = computeProgression(
      makeInput({
        completionRate: 0.3,
        streakDays: 1,
        missedWorkouts: 4,
        totalWorkoutsInWindow: 7,
        recentCompletionRates: [0.9, 0.9, 0.9], // low fatigue
      }),
    )
    expect(result.consistencyScore).toBeLessThan(0.7)
    expect(result.recommendation).toBe('hold')
  })

  it('high consistency + low fatigue → progress', () => {
    const result = computeProgression(makeInput())
    expect(result.recommendation).toBe('progress')
  })

  it('deload recommendation never coexists with shouldAdvanceRank=true', () => {
    const result = computeProgression(
      makeInput({
        progressionFactor: 0.95,
        recentCompletionRates: [0.0, 0.0, 0.0],
      }),
    )
    expect(result.recommendation).toBe('deload')
    expect(result.shouldAdvanceRank).toBe(false)
  })

  it('hold recommendation never triggers rank advancement', () => {
    const result = computeProgression(
      makeInput({
        progressionFactor: 0.95,
        completionRate: 0.3,
        streakDays: 1,
        missedWorkouts: 4,
        totalWorkoutsInWindow: 7,
        recentCompletionRates: [0.9, 0.9, 0.9],
      }),
    )
    expect(result.recommendation).toBe('hold')
    expect(result.shouldAdvanceRank).toBe(false)
  })
})

// ─── Difficulty outputs ───────────────────────────────────────────────────────

describe('computeProgression — difficulty outputs', () => {
  it('progress from factor=0 raises difficulty above current rank target', () => {
    const result = computeProgression(makeInput({ progressionFactor: 0 }))
    expect(result.recommendation).toBe('progress')
    expect(result.nextWorkout.pushups).toBeGreaterThan(CIVILIAN.target.pushups)
    expect(result.nextWorkout.cardioKm).toBeGreaterThan(CIVILIAN.target.cardioKm)
  })

  it('deload reduces workout below current rank target', () => {
    const result = computeProgression(
      makeInput({ recentCompletionRates: [0.0, 0.0, 0.0] }),
    )
    expect(result.recommendation).toBe('deload')
    expect(result.nextWorkout.pushups).toBeLessThan(CIVILIAN.target.pushups)
    expect(result.nextWorkout.cardioKm).toBeLessThan(CIVILIAN.target.cardioKm)
  })

  it('hold at factor=0 returns exactly current rank target', () => {
    const result = computeProgression(
      makeInput({
        progressionFactor: 0,
        completionRate: 0.3,
        streakDays: 1,
        missedWorkouts: 4,
        totalWorkoutsInWindow: 7,
        recentCompletionRates: [0.9, 0.9, 0.9],
      }),
    )
    expect(result.recommendation).toBe('hold')
    expect(result.nextWorkout.pushups).toBe(CIVILIAN.target.pushups)
    expect(result.nextWorkout.cardioKm).toBe(CIVILIAN.target.cardioKm)
  })

  it('hold at factor=0.5 maintains the current progression level', () => {
    const result = computeProgression(
      makeInput({
        progressionFactor: 0.5,
        completionRate: 0.3,
        streakDays: 1,
        missedWorkouts: 4,
        totalWorkoutsInWindow: 7,
        recentCompletionRates: [0.9, 0.9, 0.9],
      }),
    )
    expect(result.recommendation).toBe('hold')
    expect(result.nextProgressionFactor).toBe(0.5)
    // Workout sits between the two rank targets
    expect(result.nextWorkout.pushups).toBeGreaterThan(CIVILIAN.target.pushups)
    expect(result.nextWorkout.pushups).toBeLessThan(TRAINEE.target.pushups)
  })

  it('deload workout is the same regardless of progression factor', () => {
    const highFactor = computeProgression(
      makeInput({ progressionFactor: 0.9, recentCompletionRates: [0, 0, 0] }),
    )
    const lowFactor = computeProgression(
      makeInput({ progressionFactor: 0.1, recentCompletionRates: [0, 0, 0] }),
    )
    expect(highFactor.recommendation).toBe('deload')
    expect(lowFactor.recommendation).toBe('deload')
    expect(highFactor.nextWorkout.pushups).toBe(lowFactor.nextWorkout.pushups)
    expect(highFactor.nextWorkout.cardioKm).toBe(lowFactor.nextWorkout.cardioKm)
  })
})

// ─── Bounded outputs ─────────────────────────────────────────────────────────

describe('computeProgression — bounded outputs (never overshoot next rank)', () => {
  it('progress from factor=0.9 stays at or below next rank target', () => {
    const result = computeProgression(makeInput({ progressionFactor: 0.9 }))
    const next = TRAINEE.target
    expect(result.nextWorkout.pushups).toBeLessThanOrEqual(next.pushups)
    expect(result.nextWorkout.squats).toBeLessThanOrEqual(next.squats)
    expect(result.nextWorkout.situps).toBeLessThanOrEqual(next.situps)
    expect(result.nextWorkout.cardioKm).toBeLessThanOrEqual(next.cardioKm)
  })

  it('progress from factor=1.0 clamps at exactly next rank target', () => {
    const result = computeProgression(makeInput({ progressionFactor: 1.0 }))
    expect(result.nextWorkout.pushups).toBe(TRAINEE.target.pushups)
    expect(result.nextWorkout.squats).toBe(TRAINEE.target.squats)
    expect(result.nextWorkout.situps).toBe(TRAINEE.target.situps)
    expect(result.nextWorkout.cardioKm).toBe(TRAINEE.target.cardioKm)
  })

  it('workout never exceeds next rank target across all factor values', () => {
    const factors = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]
    const next = TRAINEE.target
    for (const factor of factors) {
      const result = computeProgression(makeInput({ progressionFactor: factor }))
      expect(result.nextWorkout.pushups).toBeLessThanOrEqual(next.pushups)
      expect(result.nextWorkout.squats).toBeLessThanOrEqual(next.squats)
      expect(result.nextWorkout.situps).toBeLessThanOrEqual(next.situps)
      expect(result.nextWorkout.cardioKm).toBeLessThanOrEqual(next.cardioKm)
    }
  })

  it('progression factor never exceeds 1', () => {
    const result = computeProgression(makeInput({ progressionFactor: 1.0 }))
    expect(result.nextProgressionFactor).toBeLessThanOrEqual(1)
  })

  it('progression factor never drops below 0 on deload', () => {
    const result = computeProgression(
      makeInput({ progressionFactor: 0, recentCompletionRates: [0, 0, 0] }),
    )
    expect(result.nextProgressionFactor).toBeGreaterThanOrEqual(0)
  })
})

// ─── Rank advancement (two-gate requirement) ──────────────────────────────────

describe('computeProgression — rank advancement', () => {
  it('advances rank when both consistency and factor thresholds are met', () => {
    const result = computeProgression(
      makeInput({
        progressionFactor: 0.95,
        completionRate: 1.0,
        streakDays: 14,
        missedWorkouts: 0,
        totalWorkoutsInWindow: 14,
        recentCompletionRates: [1.0, 1.0, 1.0, 1.0, 1.0],
      }),
    )
    expect(result.shouldAdvanceRank).toBe(true)
  })

  it('does not advance on low consistency even with high factor', () => {
    const result = computeProgression(
      makeInput({
        progressionFactor: 0.95,
        completionRate: 0.3,
        streakDays: 1,
        missedWorkouts: 5,
        totalWorkoutsInWindow: 7,
        recentCompletionRates: [0.9, 0.9, 0.9],
      }),
    )
    expect(result.shouldAdvanceRank).toBe(false)
  })

  it('does not advance on low factor even with perfect consistency', () => {
    const result = computeProgression(makeInput({ progressionFactor: 0.3 }))
    expect(result.shouldAdvanceRank).toBe(false)
  })

  it('never advances past the max rank (nextRank = null)', () => {
    const result = computeProgression(
      makeInput({
        currentRank: CAPED_BALDY,
        nextRank: null,
        progressionFactor: 1.0,
        completionRate: 1.0,
        streakDays: 30,
        missedWorkouts: 0,
        totalWorkoutsInWindow: 30,
        recentCompletionRates: [1, 1, 1, 1, 1],
      }),
    )
    expect(result.shouldAdvanceRank).toBe(false)
  })

  it('at max rank the workout is exactly the max rank target', () => {
    const result = computeProgression(
      makeInput({
        currentRank: CAPED_BALDY,
        nextRank: null,
        progressionFactor: 1.0,
      }),
    )
    expect(result.nextWorkout).toEqual(CAPED_BALDY.target)
  })
})

// ─── Progression factor movement ─────────────────────────────────────────────

describe('computeProgression — factor movement', () => {
  it('progress increases factor', () => {
    const factor = 0.3
    const result = computeProgression(makeInput({ progressionFactor: factor }))
    expect(result.recommendation).toBe('progress')
    expect(result.nextProgressionFactor).toBeGreaterThan(factor)
  })

  it('hold preserves factor exactly', () => {
    const factor = 0.5
    const result = computeProgression(
      makeInput({
        progressionFactor: factor,
        completionRate: 0.3,
        streakDays: 1,
        missedWorkouts: 4,
        totalWorkoutsInWindow: 7,
        recentCompletionRates: [0.9, 0.9, 0.9],
      }),
    )
    expect(result.recommendation).toBe('hold')
    expect(result.nextProgressionFactor).toBe(factor)
  })

  it('deload decreases factor', () => {
    const factor = 0.6
    const result = computeProgression(
      makeInput({ progressionFactor: factor, recentCompletionRates: [0, 0, 0] }),
    )
    expect(result.recommendation).toBe('deload')
    expect(result.nextProgressionFactor).toBeLessThan(factor)
  })
})
