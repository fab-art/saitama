import { describe, it, expect } from 'vitest'
import { updateStreak } from './streak'
import type { StreakStatus } from './streak'

// ─── First workout ever ───────────────────────────────────────────────────────

describe('updateStreak — first workout (null lastCompletionDate)', () => {
  it('starts streak at 1 with incremented status', () => {
    const result = updateStreak(0, null, '2024-06-01')
    expect(result.count).toBe(1)
    expect(result.status).toBe('incremented')
  })

  it('currentStreak value is ignored when lastCompletionDate is null', () => {
    // Some callers may pass a stale count; the result must still be 1
    const result = updateStreak(99, null, '2024-06-01')
    expect(result.count).toBe(1)
    expect(result.status).toBe('incremented')
  })
})

// ─── Same-day repeat (maintained) ────────────────────────────────────────────

describe('updateStreak — same day (maintained)', () => {
  it('same date returns unchanged count', () => {
    const result = updateStreak(7, '2024-06-15', '2024-06-15')
    expect(result.count).toBe(7)
    expect(result.status).toBe('maintained')
  })

  it('preserved count of 1 on same-day repeat', () => {
    const result = updateStreak(1, '2024-01-01', '2024-01-01')
    expect(result.count).toBe(1)
    expect(result.status).toBe('maintained')
  })
})

// ─── Consecutive day (incremented) ───────────────────────────────────────────

describe('updateStreak — consecutive day (incremented)', () => {
  it('next calendar day increments count', () => {
    const result = updateStreak(4, '2024-06-14', '2024-06-15')
    expect(result.count).toBe(5)
    expect(result.status).toBe('incremented')
  })

  it('count of 0 increments to 1', () => {
    const result = updateStreak(0, '2024-06-14', '2024-06-15')
    expect(result.count).toBe(1)
    expect(result.status).toBe('incremented')
  })

  it('month boundary: Jan 31 → Feb 1 is one consecutive day', () => {
    const result = updateStreak(10, '2024-01-31', '2024-02-01')
    expect(result.count).toBe(11)
    expect(result.status).toBe('incremented')
  })

  it('year boundary: Dec 31 → Jan 1 is one consecutive day', () => {
    const result = updateStreak(30, '2023-12-31', '2024-01-01')
    expect(result.count).toBe(31)
    expect(result.status).toBe('incremented')
  })

  it('leap-year Feb 29 → Mar 1 is one consecutive day', () => {
    // 2024 is a leap year
    const result = updateStreak(5, '2024-02-29', '2024-03-01')
    expect(result.count).toBe(6)
    expect(result.status).toBe('incremented')
  })

  it('non-leap-year Feb 28 → Mar 1 is one consecutive day', () => {
    // 2023 is not a leap year; Feb 28 + 1 = Mar 1
    const result = updateStreak(5, '2023-02-28', '2023-03-01')
    expect(result.count).toBe(6)
    expect(result.status).toBe('incremented')
  })
})

// ─── Grace period (warned) ────────────────────────────────────────────────────

describe('updateStreak — one missed day (warned)', () => {
  it('gap of 2 days preserves streak with warned status', () => {
    const result = updateStreak(10, '2024-06-13', '2024-06-15')
    expect(result.count).toBe(10) // streak preserved
    expect(result.status).toBe('warned')
  })

  it('warned preserves the exact prior count regardless of streak length', () => {
    const result = updateStreak(42, '2024-01-03', '2024-01-05')
    expect(result.count).toBe(42)
    expect(result.status).toBe('warned')
  })

  it('month boundary miss: Jan 30 → Feb 1 (gap 2) is warned', () => {
    const result = updateStreak(5, '2024-01-30', '2024-02-01')
    expect(result.count).toBe(5)
    expect(result.status).toBe('warned')
  })

  it('year boundary miss: Dec 30 → Jan 1 (gap 2) is warned', () => {
    const result = updateStreak(20, '2023-12-30', '2024-01-01')
    expect(result.count).toBe(20)
    expect(result.status).toBe('warned')
  })

  it('leap-year miss: Feb 28 → Mar 1 in 2024 (gap 2, skipping Feb 29) is warned', () => {
    // 2024 is a leap year; Feb 28 + 2 = Mar 1 (skips Feb 29)
    const result = updateStreak(8, '2024-02-28', '2024-03-01')
    expect(result.count).toBe(8)
    expect(result.status).toBe('warned')
  })
})

// ─── Reset ────────────────────────────────────────────────────────────────────

describe('updateStreak — multiple missed days (reset)', () => {
  it('gap of 3 days (one beyond grace) resets streak to 1', () => {
    const result = updateStreak(15, '2024-06-12', '2024-06-15')
    expect(result.count).toBe(1)
    expect(result.status).toBe('reset')
  })

  it('long absence resets streak to 1', () => {
    const result = updateStreak(50, '2024-01-01', '2024-07-01')
    expect(result.count).toBe(1)
    expect(result.status).toBe('reset')
  })

  it('reset always returns count 1, regardless of prior streak size', () => {
    const small = updateStreak(1, '2024-01-01', '2024-12-31')
    const large = updateStreak(365, '2024-01-01', '2024-12-31')
    expect(small.count).toBe(1)
    expect(large.count).toBe(1)
  })

  it('month boundary reset: gap 3 across months', () => {
    // Jan 29 → Feb 1 = 3 days
    const result = updateStreak(7, '2024-01-29', '2024-02-01')
    expect(result.count).toBe(1)
    expect(result.status).toBe('reset')
  })

  it('year boundary reset: Dec 29 → Jan 1 = 3 days', () => {
    const result = updateStreak(7, '2023-12-29', '2024-01-01')
    expect(result.count).toBe(1)
    expect(result.status).toBe('reset')
  })
})

// ─── Grace boundary precision ─────────────────────────────────────────────────

describe('updateStreak — exact grace boundary', () => {
  it('gap of exactly 2 → warned (last day of grace)', () => {
    const result = updateStreak(5, '2024-03-10', '2024-03-12')
    expect(result.status).toBe('warned')
  })

  it('gap of exactly 3 → reset (first day past grace)', () => {
    const result = updateStreak(5, '2024-03-10', '2024-03-13')
    expect(result.status).toBe('reset')
  })
})

// ─── Defensive edge cases ─────────────────────────────────────────────────────

describe('updateStreak — edge cases', () => {
  it('today before lastCompletionDate (negative gap) is treated as same day', () => {
    // Clock skew or timezone weirdness — must not crash or corrupt streak
    const result = updateStreak(5, '2024-06-20', '2024-06-15')
    expect(result.count).toBe(5)
    expect(result.status).toBe('maintained')
  })
})

// ─── All four status branches reachable ──────────────────────────────────────

describe('updateStreak — status enum completeness', () => {
  const base = '2024-03-10'
  const cases: Array<[string, StreakStatus]> = [
    ['2024-03-10', 'maintained'],  // gap 0
    ['2024-03-11', 'incremented'], // gap 1
    ['2024-03-12', 'warned'],      // gap 2 (grace)
    ['2024-03-13', 'reset'],       // gap 3 (beyond grace)
  ]

  it.each(cases)('today=%s → status %s', (today, expectedStatus) => {
    const result = updateStreak(5, base, today)
    expect(result.status).toBe(expectedStatus)
  })
})
