import type { Rank, WorkoutExercise } from './types'

// prettier-ignore
const RANKS = Object.freeze([
  { rankNumber: 1, name: 'Civilian',       target: { pushups: 5,   squats: 5,   situps: 5,   cardioKm: 0.5 } },
  { rankNumber: 2, name: 'Trainee',        target: { pushups: 10,  squats: 10,  situps: 10,  cardioKm: 1   } },
  { rankNumber: 3, name: 'Fighter',        target: { pushups: 20,  squats: 20,  situps: 20,  cardioKm: 2   } },
  { rankNumber: 4, name: 'Hunter',         target: { pushups: 35,  squats: 35,  situps: 35,  cardioKm: 3   } },
  { rankNumber: 5, name: 'Elite',          target: { pushups: 50,  squats: 50,  situps: 50,  cardioKm: 5   } },
  { rankNumber: 6, name: 'Hero Candidate', target: { pushups: 70,  squats: 70,  situps: 70,  cardioKm: 7   } },
  { rankNumber: 7, name: 'Hero',           target: { pushups: 85,  squats: 85,  situps: 85,  cardioKm: 8.5 } },
  { rankNumber: 8, name: 'Caped Baldy',    target: { pushups: 100, squats: 100, situps: 100, cardioKm: 10  } },
] as const satisfies readonly Rank[])

export { RANKS }

export function getRankByNumber(rankNumber: number): Rank | null {
  return RANKS.find(r => r.rankNumber === rankNumber) ?? null
}

export function getNextRank(rankNumber: number): Rank | null {
  return getRankByNumber(rankNumber + 1)
}

export function getRankWorkout(rankNumber: number): WorkoutExercise | null {
  return getRankByNumber(rankNumber)?.target ?? null
}
