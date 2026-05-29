import { describe, it, expect } from 'vitest'
import { startingRankFromAssessment, ASSESSMENT_QUESTIONS } from './assessment'
import type { AssessmentAnswer } from './assessment'

function ans(questionId: string, rankSuggestion: number): AssessmentAnswer {
  return { questionId, rankSuggestion }
}

// ─── startingRankFromAssessment — conservative bias ───────────────────────────

describe('startingRankFromAssessment — conservative bias', () => {
  it('returns 1 when no answers are provided (safest default)', () => {
    expect(startingRankFromAssessment([])).toBe(1)
  })

  it('returns the single answer rank when only one answer is given', () => {
    expect(startingRankFromAssessment([ans('pushups', 3)])).toBe(3)
  })

  it('returns the minimum suggestion across all answers (weakest link wins)', () => {
    expect(
      startingRankFromAssessment([ans('pushups', 4), ans('cardio', 1)]),
    ).toBe(1)
  })

  it('returns 1 when one strong and one weak answer exist', () => {
    expect(
      startingRankFromAssessment([ans('pushups', 4), ans('cardio', 1)]),
    ).toBe(1)
  })

  it('returns 2 when both answers suggest rank 2', () => {
    expect(
      startingRankFromAssessment([ans('pushups', 2), ans('cardio', 2)]),
    ).toBe(2)
  })

  it('picks the lower of two different suggestions', () => {
    expect(
      startingRankFromAssessment([ans('pushups', 3), ans('cardio', 2)]),
    ).toBe(2)
  })

  it('caps the result at 4 even when every answer suggests a higher rank', () => {
    expect(
      startingRankFromAssessment([ans('pushups', 7), ans('cardio', 8)]),
    ).toBe(4)
  })

  it('caps at 4 for a single out-of-range answer', () => {
    expect(startingRankFromAssessment([ans('pushups', 6)])).toBe(4)
  })

  it('all rank 1 answers → rank 1', () => {
    expect(
      startingRankFromAssessment([ans('pushups', 1), ans('cardio', 1)]),
    ).toBe(1)
  })

  it('all rank 4 answers → rank 4 (maximum allowed start)', () => {
    expect(
      startingRankFromAssessment([ans('pushups', 4), ans('cardio', 4)]),
    ).toBe(4)
  })

  it('mixed rank 3 and 4 → rank 3 (conservative)', () => {
    expect(
      startingRankFromAssessment([ans('pushups', 4), ans('cardio', 3)]),
    ).toBe(3)
  })

  it('ambiguous lower bound: min=1 overrides any higher suggestions', () => {
    const manyAnswers = [
      ans('pushups', 4),
      ans('cardio', 4),
      ans('extra', 1),
    ]
    expect(startingRankFromAssessment(manyAnswers)).toBe(1)
  })

  it('result is always in range [1, 4]', () => {
    const cases: ReadonlyArray<AssessmentAnswer>[] = [
      [],
      [ans('q', 0)],
      [ans('q', -5)],
      [ans('q', 9)],
      [ans('q', 2), ans('q2', 3)],
    ]
    for (const c of cases) {
      const rank = startingRankFromAssessment(c)
      expect(rank).toBeGreaterThanOrEqual(1)
      expect(rank).toBeLessThanOrEqual(4)
    }
  })
})

// ─── ASSESSMENT_QUESTIONS catalog integrity ───────────────────────────────────

describe('ASSESSMENT_QUESTIONS catalog', () => {
  it('contains at least 2 questions', () => {
    expect(ASSESSMENT_QUESTIONS.length).toBeGreaterThanOrEqual(2)
  })

  it('each question has at least 2 options', () => {
    for (const q of ASSESSMENT_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('every option rankSuggestion is between 1 and 8', () => {
    for (const q of ASSESSMENT_QUESTIONS) {
      for (const opt of q.options) {
        expect(opt.rankSuggestion).toBeGreaterThanOrEqual(1)
        expect(opt.rankSuggestion).toBeLessThanOrEqual(8)
      }
    }
  })

  it('each question has an id, text, and subtext', () => {
    for (const q of ASSESSMENT_QUESTIONS) {
      expect(q.id.length).toBeGreaterThan(0)
      expect(q.text.length).toBeGreaterThan(0)
      expect(q.subtext.length).toBeGreaterThan(0)
    }
  })

  it('the lowest option in each question suggests rank 1 (safe floor)', () => {
    for (const q of ASSESSMENT_QUESTIONS) {
      const lowest = Math.min(...q.options.map((o) => o.rankSuggestion))
      expect(lowest).toBe(1)
    }
  })
})
