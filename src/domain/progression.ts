import type { Rank, WorkoutExercise } from './types'

// ─── Safety thresholds ────────────────────────────────────────────────────────

// Fatigue at or above this triggers a deload, overriding any consistency gain.
// Safety-first ordering: an exhausted user escalating difficulty risks burnout.
const FATIGUE_DELOAD_THRESHOLD = 0.6

// Consistency must reach this before difficulty is allowed to escalate.
// Below it the engine holds; it never escalates on a shaky attendance record.
const CONSISTENCY_PROGRESS_THRESHOLD = 0.7

// Both gates must open simultaneously for a rank advancement to trigger.
// Two-gate design ensures "sustained" completion, not a single good session.
const ADVANCE_CONSISTENCY_MIN = 0.8
const ADVANCE_FACTOR_MIN = 0.9 // must be 90 %+ of the way toward the next rank

// ─── Progression step sizes ───────────────────────────────────────────────────

// Each advancing session moves the factor 10 % closer to the next rank.
// Ten consecutive "progress" sessions covers the full 0 → 1 range.
const PROGRESSION_STEP = 0.1

// Each deload session steps the factor back 15 % — slightly larger than the
// progress step so a run of fatigue doesn't silently lock the user near the
// next-rank threshold.
const DELOAD_STEP = 0.15

// During a deload the workout is scaled to 85 % of the current rank target,
// giving a meaningful volume reduction while staying within safe range.
const DELOAD_SCALE = 0.85

// A 7-day streak fully saturates the streak component of consistency.
// Beyond 7 days the streak factor stays at 1 — prevents runaway scores.
const STREAK_SATURATION_DAYS = 7

// ─── Types ────────────────────────────────────────────────────────────────────

export type Recommendation = 'progress' | 'hold' | 'deload'

export type ProgressionInput = {
  currentRank: Rank
  nextRank: Rank | null
  /** 0–1: how far between currentRank target and nextRank target the user is. */
  progressionFactor: number
  /** Average completion ratio across the recent session window (0–1). */
  completionRate: number
  /** Active streak length in days. */
  streakDays: number
  /** Planned sessions skipped in the observation window. */
  missedWorkouts: number
  /** Total session slots (completed + missed) in the observation window. */
  totalWorkoutsInWindow: number
  /**
   * Per-session completion ratios, most-recent first.
   * Used to detect a declining-trend signal on top of the raw average.
   */
  recentCompletionRates: ReadonlyArray<number>
}

export type ProgressionOutput = {
  nextWorkout: WorkoutExercise
  nextProgressionFactor: number
  consistencyScore: number
  fatigueScore: number
  recommendation: Recommendation
  shouldAdvanceRank: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

// ─── Score functions (exported for testing and Progression DB state) ─────────

/**
 * Derives a 0–1 consistency score.
 * Weights: completion quality 50 %, streak regularity 30 %, session presence 20 %.
 */
export function computeConsistencyScore(
  completionRate: number,
  streakDays: number,
  missedWorkouts: number,
  totalWorkoutsInWindow: number,
): number {
  const streakFactor = clamp01(streakDays / STREAK_SATURATION_DAYS)
  const presenceFactor =
    totalWorkoutsInWindow > 0
      ? clamp01(1 - missedWorkouts / totalWorkoutsInWindow)
      : 1
  return clamp01(completionRate) * 0.5 + streakFactor * 0.3 + presenceFactor * 0.2
}

/**
 * Derives a 0–1 fatigue score.
 * Base fatigue = 1 − average completion.
 * Trend penalty: if the most-recent session falls below the window average,
 * that declining signal adds up to +30 % of the gap — catching a user who is
 * starting to struggle even if their overall average still looks acceptable.
 */
export function computeFatigueScore(
  recentCompletionRates: ReadonlyArray<number>,
): number {
  if (recentCompletionRates.length === 0) return 0

  const avg =
    recentCompletionRates.reduce((sum, r) => sum + r, 0) /
    recentCompletionRates.length
  const baseFatigue = 1 - clamp01(avg)

  if (recentCompletionRates.length >= 2) {
    const mostRecent = recentCompletionRates[0]
    const declinePenalty = Math.max(0, (avg - mostRecent) * 0.3)
    return clamp01(baseFatigue + declinePenalty)
  }

  return baseFatigue
}

// ─── Internal engine helpers ──────────────────────────────────────────────────

function chooseRecommendation(
  consistencyScore: number,
  fatigueScore: number,
): Recommendation {
  // Fatigue is evaluated first — it can override even excellent consistency.
  // This is the explicit encoding of "consistency over intensity."
  if (fatigueScore >= FATIGUE_DELOAD_THRESHOLD) return 'deload'
  if (consistencyScore >= CONSISTENCY_PROGRESS_THRESHOLD) return 'progress'
  return 'hold'
}

function advanceFactor(current: number, rec: Recommendation): number {
  if (rec === 'progress') return Math.min(1, current + PROGRESSION_STEP)
  if (rec === 'deload') return Math.max(0, current - DELOAD_STEP)
  return current
}

/**
 * Builds the recommended next workout.
 *
 * - deload:   85 % of the current rank's target — a safe recovery baseline
 *             that ignores the progression factor intentionally.
 * - hold:     interpolate(current, next, factor) — sustains the current level.
 * - progress: interpolate(current, next, factor) — same formula, higher factor.
 *
 * The interpolation factor is always clamped to [0, 1] so the output can
 * never exceed the next rank's targets, satisfying the smooth-bounded rule.
 */
function buildNextWorkout(
  currentRank: Rank,
  nextRank: Rank | null,
  factor: number,
  rec: Recommendation,
): WorkoutExercise {
  const cur = currentRank.target

  if (rec === 'deload') {
    return {
      pushups: Math.max(1, Math.floor(cur.pushups * DELOAD_SCALE)),
      squats: Math.max(1, Math.floor(cur.squats * DELOAD_SCALE)),
      situps: Math.max(1, Math.floor(cur.situps * DELOAD_SCALE)),
      cardioKm: parseFloat((cur.cardioKm * DELOAD_SCALE).toFixed(2)),
    }
  }

  if (nextRank === null) {
    // At the final rank — maintain it indefinitely
    return { ...cur }
  }

  const nxt = nextRank.target
  const f = clamp01(factor)
  return {
    pushups: Math.round(cur.pushups + (nxt.pushups - cur.pushups) * f),
    squats: Math.round(cur.squats + (nxt.squats - cur.squats) * f),
    situps: Math.round(cur.situps + (nxt.situps - cur.situps) * f),
    cardioKm: parseFloat(
      (cur.cardioKm + (nxt.cardioKm - cur.cardioKm) * f).toFixed(2),
    ),
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Adaptive progression engine — pure and clock-free.
 *
 * Evaluates safety guardrails before escalating difficulty:
 *   1. If fatigue ≥ threshold → deload (overrides everything).
 *   2. If consistency ≥ threshold → progress.
 *   3. Otherwise → hold.
 *
 * Difficulty scales asymptotically toward the next rank target via
 * a progression factor in [0, 1], and can never overshoot that target.
 */
export function computeProgression(input: ProgressionInput): ProgressionOutput {
  const {
    currentRank,
    nextRank,
    progressionFactor,
    completionRate,
    streakDays,
    missedWorkouts,
    totalWorkoutsInWindow,
    recentCompletionRates,
  } = input

  const consistencyScore = computeConsistencyScore(
    completionRate,
    streakDays,
    missedWorkouts,
    totalWorkoutsInWindow,
  )
  const fatigueScore = computeFatigueScore(recentCompletionRates)
  const recommendation = chooseRecommendation(consistencyScore, fatigueScore)
  const nextProgressionFactor = advanceFactor(progressionFactor, recommendation)
  const nextWorkout = buildNextWorkout(
    currentRank,
    nextRank,
    nextProgressionFactor,
    recommendation,
  )

  const shouldAdvanceRank =
    nextRank !== null &&
    recommendation === 'progress' &&
    nextProgressionFactor >= ADVANCE_FACTOR_MIN &&
    consistencyScore >= ADVANCE_CONSISTENCY_MIN

  return {
    nextWorkout,
    nextProgressionFactor,
    consistencyScore,
    fatigueScore,
    recommendation,
    shouldAdvanceRank,
  }
}
