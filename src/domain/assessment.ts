export type AssessmentAnswer = {
  questionId: string
  rankSuggestion: number
}

export type AssessmentOption = {
  readonly label: string
  readonly rankSuggestion: number
}

export type AssessmentQuestion = {
  readonly id: string
  readonly text: string
  readonly subtext: string
  readonly options: readonly AssessmentOption[]
}

export const ASSESSMENT_QUESTIONS: readonly AssessmentQuestion[] = [
  {
    id: 'pushups',
    text: 'How many push-ups can you do in one go?',
    subtext: "Take your best guess — it's just a safe starting point.",
    options: [
      { label: "I'm just starting out / fewer than 5", rankSuggestion: 1 },
      { label: '5 to 10', rankSuggestion: 2 },
      { label: '10 to 30', rankSuggestion: 3 },
      { label: '30 or more', rankSuggestion: 4 },
    ],
  },
  {
    id: 'cardio',
    text: 'How far can you run or walk without stopping?',
    subtext: 'Any pace counts — brisk walking is absolutely fine.',
    options: [
      { label: 'Less than 1 km', rankSuggestion: 1 },
      { label: '1 to 2 km', rankSuggestion: 2 },
      { label: '2 to 5 km', rankSuggestion: 3 },
      { label: 'More than 5 km', rankSuggestion: 4 },
    ],
  },
]

/**
 * Converts assessment answers into a safe starting rank.
 *
 * Conservative bias: the minimum rank suggestion across all answers is used,
 * so any weakness in any area sets the floor. No answers → Rank 1 (safest).
 * The result is capped at 4 (Hunter) to prevent starting at an intense level.
 */
export function startingRankFromAssessment(
  answers: ReadonlyArray<AssessmentAnswer>,
): number {
  if (answers.length === 0) return 1
  const min = Math.min(...answers.map((a) => a.rankSuggestion))
  return Math.max(1, Math.min(min, 4))
}
