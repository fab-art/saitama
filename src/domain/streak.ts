// How many consecutive days a user may miss before their streak resets.
// 1 = a single missed session (illness, travel, rest day) is forgiven;
// two or more consecutive misses signal a genuine pattern break and reset.
const STREAK_GRACE_DAYS = 1

export type StreakStatus = 'incremented' | 'maintained' | 'warned' | 'reset'

export type StreakResult = {
  count: number
  status: StreakStatus
}

/**
 * Computes the number of whole calendar days from `from` to `to` (YYYY-MM-DD).
 * Uses Date.UTC so the result is immune to local-timezone offsets — parsing
 * each component explicitly avoids the "YYYY-MM-DD treated as UTC vs local"
 * ambiguity that plagues `new Date(dateString)`.
 */
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const msFrom = Date.UTC(fy, fm - 1, fd)
  const msTo = Date.UTC(ty, tm - 1, td)
  return Math.round((msTo - msFrom) / 86_400_000)
}

/**
 * Pure, clock-free streak update. The caller is responsible for injecting
 * the current date — domain code never reads Date.now() or new Date().
 *
 * @param currentStreak  Streak count before this workout.
 * @param lastCompletionDate  YYYY-MM-DD of the previous completed workout,
 *                            or null if this is the user's first ever.
 * @param today  YYYY-MM-DD of the workout being logged (injected by store).
 */
export function updateStreak(
  currentStreak: number,
  lastCompletionDate: string | null,
  today: string,
): StreakResult {
  if (lastCompletionDate === null) {
    return { count: 1, status: 'incremented' }
  }

  const gap = daysBetween(lastCompletionDate, today)

  if (gap <= 0) {
    // Same-day repeat, or today is somehow before last (treat defensively)
    return { count: currentStreak, status: 'maintained' }
  }

  if (gap === 1) {
    return { count: currentStreak + 1, status: 'incremented' }
  }

  if (gap <= 1 + STREAK_GRACE_DAYS) {
    // Within the grace window: streak is preserved but the UI should warn
    return { count: currentStreak, status: 'warned' }
  }

  return { count: 1, status: 'reset' }
}
