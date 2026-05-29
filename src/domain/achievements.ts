/**
 * Aggregate user stats snapshot passed to predicates.
 * Pure data — no DB types, no React. Computed by the store and passed in.
 */
export type AchievementState = {
  totalWorkouts: number
  totalPushups: number
  totalSquats: number
  totalSitups: number
  totalCardioKm: number
  /** Active streak at evaluation time. */
  currentStreak: number
  /** Highest streak the user has ever maintained. Used by predicates so
   *  achievements remain unlocked after a streak break. */
  longestStreak: number
  /** 0–1 composite from computeConsistencyScore in progression.ts. */
  consistencyScore: number
  rankNumber: number
}

export type AchievementReward = {
  /** Flat XP added to the workout XP breakdown on unlock. */
  xpBonus: number
  /** Optional UI identifier for a one-shot visual effect on celebration. */
  cosmetic?: string
}

export type AchievementDefinition = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly reward: AchievementReward
  /** Pure predicate over aggregate stats. Must be side-effect-free. */
  readonly predicate: (state: AchievementState) => boolean
}

// ─── Catalog ─────────────────────────────────────────────────────────────────
//
// Data-driven: adding a new achievement = appending one object here.
// Predicates intentionally use the weakest sufficient field so they remain
// permanently true once satisfied (longestStreak, not currentStreak).

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  {
    id: 'first-workout',
    title: 'First Step',
    description: 'Complete your very first workout.',
    reward: { xpBonus: 100 },
    predicate: (s) => s.totalWorkouts >= 1,
  },
  {
    id: 'streak-3',
    title: '3-Day Streak',
    description: 'Train on 3 consecutive days.',
    reward: { xpBonus: 150, cosmetic: 'streak-flame' },
    predicate: (s) => s.longestStreak >= 3,
  },
  {
    id: 'streak-7',
    title: '7-Day Streak',
    description: 'Complete a full week of training without missing a day.',
    reward: { xpBonus: 300, cosmetic: 'streak-inferno' },
    predicate: (s) => s.longestStreak >= 7,
  },
  {
    id: 'first-1km',
    title: 'First 1 km Run',
    description: 'Accumulate your first kilometre of cardio across all sessions.',
    reward: { xpBonus: 200, cosmetic: 'runner-trail' },
    predicate: (s) => s.totalCardioKm >= 1,
  },
  {
    id: 'pushups-100',
    title: '100 Total Push-Ups',
    description: 'Accumulate 100 push-ups across all your workouts.',
    reward: { xpBonus: 250, cosmetic: 'power-burst' },
    predicate: (s) => s.totalPushups >= 100,
  },
  {
    id: 'consistency-warrior',
    title: 'Consistency Warrior',
    description:
      'Complete 20 workouts while maintaining a consistency score of 0.8 or higher.',
    reward: { xpBonus: 500, cosmetic: 'warrior-aura' },
    predicate: (s) => s.totalWorkouts >= 20 && s.consistencyScore >= 0.8,
  },
]

// ─── Evaluator ───────────────────────────────────────────────────────────────

/**
 * Returns the subset of the catalog that is *newly* unlocked by `state`.
 *
 * Achievements already present in `currentlyUnlocked` are always excluded,
 * ensuring celebration animations fire exactly once regardless of how many
 * times this function is called with the same or improving state.
 *
 * @param currentlyUnlocked  IDs of achievements already recorded in the DB.
 * @param state              Aggregate stats snapshot from the store.
 */
export function evaluateAchievements(
  currentlyUnlocked: ReadonlyArray<string>,
  state: AchievementState,
): AchievementDefinition[] {
  const unlocked = new Set(currentlyUnlocked)
  return ACHIEVEMENT_CATALOG.filter((a) => !unlocked.has(a.id) && a.predicate(state))
}
