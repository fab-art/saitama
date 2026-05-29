import { create } from 'zustand'
import type { Progression, WorkoutExercise } from '@/domain/types'
import type { Recommendation } from '@/domain/progression'
import { db, getProgressionRepository } from '@/db'
import type { ProgressionRepository } from '@/db'

type ProgressionState = {
  progression: Progression | null
  recommendation: Recommendation | null
  nextWorkout: WorkoutExercise | null
  shouldAdvanceRank: boolean
}

type ProgressionActions = {
  init(): Promise<void>
  setProgression(
    progression: Progression,
    recommendation: Recommendation,
    nextWorkout: WorkoutExercise,
    shouldAdvanceRank: boolean,
  ): void
}

export type ProgressionStore = ProgressionState & ProgressionActions

type Deps = {
  progressionRepo: ProgressionRepository
}

export function createProgressionStore(deps: Deps) {
  return create<ProgressionStore>()((set) => ({
    progression: null,
    recommendation: null,
    nextWorkout: null,
    shouldAdvanceRank: false,

    async init() {
      try {
        const progression = await deps.progressionRepo.get()
        set({ progression })
      } catch {
        // degrade gracefully — missing progression is non-fatal
      }
    },

    setProgression(progression, recommendation, nextWorkout, shouldAdvanceRank) {
      set({ progression, recommendation, nextWorkout, shouldAdvanceRank })
    },
  }))
}

export const useProgressionStore = createProgressionStore({
  progressionRepo: getProgressionRepository(db),
})
