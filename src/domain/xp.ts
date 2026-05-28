import type { WorkoutExercise } from './types'

// ─── Level curve ─────────────────────────────────────────────────────────────
//
// Cumulative XP threshold to reach level N:
//   xpForLevel(N) = floor(BASE × (N - 1) ^ POWER)
//
// Why power 1.6?
//   - Super-linear but sub-quadratic: early levels (2–5) fall after just a
//     handful of workouts, giving the "frequent micro-reward" feel.
//   - Mid levels (10–20) require weeks of consistent training.
//   - Level 100 (~317 k XP) remains an aspirational long-term goal without
//     being mathematically impossible for a dedicated user.
//
// Why base 200?
//   Anchors level 2 at exactly 200 XP — approximately one solid workout with
//   a streak bonus — so the first level-up is almost immediately reachable.

const LEVEL_BASE = 200
const LEVEL_POWER = 1.6
const MAX_LEVEL = 100

/** Cumulative XP required to *reach* `level`. Returns 0 for level ≤ 1. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.floor(LEVEL_BASE * Math.pow(level - 1, LEVEL_POWER))
}

/** Returns the level a user is at given their total accumulated XP. Never < 1. */
export function levelFromTotalXp(totalXp: number): number {
  if (totalXp <= 0) return 1
  let level = 1
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= totalXp) {
    level++
  }
  return level
}

// ─── XP sources ──────────────────────────────────────────────────────────────

const BASE_COMPLETION_XP = 100 // awarded at 100 % completion of all targets
const PERFECT_BONUS_XP = 50 // all four exercises hit or exceeded
const ACHIEVEMENT_XP = 75 // per newly unlocked achievement

// Streak tiers: evaluated highest-first; first match wins.
const STREAK_TIERS: ReadonlyArray<{ minDays: number; bonus: number }> = [
  { minDays: 30, bonus: 100 },
  { minDays: 14, bonus: 75 },
  { minDays: 7, bonus: 50 },
  { minDays: 3, bonus: 25 },
  { minDays: 0, bonus: 0 },
]

export type XpBreakdown = {
  /** Proportional to completion ratio across all four exercises, max 100. */
  base: number
  /** Flat bonus for hitting or exceeding every exercise target. */
  perfectBonus: number
  /** Bonus from the current streak tier (0 / 25 / 50 / 75 / 100). */
  streakBonus: number
  /**
   * XP from newly unlocked achievements. Pass 0 initially — the store adds
   * this after achievement evaluation (which runs after XP in the sequence).
   */
  achievementBonus: number
  /** Sum of all components; used for persistence. */
  total: number
}

export type WorkoutXpOptions = {
  streakDays: number
  /** Number of achievements unlocked during this workout session. Default 0. */
  newAchievements?: number
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function clampedRatio(actual: number, target: number): number {
  if (target <= 0) return 1
  return Math.min(actual / target, 1)
}

function overallCompletionRatio(workout: WorkoutExercise, target: WorkoutExercise): number {
  return (
    (clampedRatio(workout.pushups, target.pushups) +
      clampedRatio(workout.squats, target.squats) +
      clampedRatio(workout.situps, target.situps) +
      clampedRatio(workout.cardioKm, target.cardioKm)) /
    4
  )
}

function isPerfectCompletion(workout: WorkoutExercise, target: WorkoutExercise): boolean {
  return (
    workout.pushups >= target.pushups &&
    workout.squats >= target.squats &&
    workout.situps >= target.situps &&
    workout.cardioKm >= target.cardioKm
  )
}

function streakBonusFor(streakDays: number): number {
  return STREAK_TIERS.find(t => streakDays >= t.minDays)?.bonus ?? 0
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns an itemized XP breakdown for a completed workout so the UI can
 * animate each reward source independently as a micro-reward sequence.
 */
export function calculateWorkoutXp(
  workout: WorkoutExercise,
  target: WorkoutExercise,
  options: WorkoutXpOptions,
): XpBreakdown {
  const ratio = overallCompletionRatio(workout, target)
  const base = Math.floor(BASE_COMPLETION_XP * ratio)
  const perfectBonus = isPerfectCompletion(workout, target) ? PERFECT_BONUS_XP : 0
  const streakBonus = streakBonusFor(options.streakDays)
  const achievementBonus = (options.newAchievements ?? 0) * ACHIEVEMENT_XP
  const total = base + perfectBonus + streakBonus + achievementBonus
  return { base, perfectBonus, streakBonus, achievementBonus, total }
}
