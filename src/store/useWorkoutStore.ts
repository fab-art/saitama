import { create } from 'zustand'
import type { Workout, WorkoutExercise, User, Progression } from '@/domain/types'
import { calculateWorkoutXp, workoutCompletionRatio, levelFromTotalXp } from '@/domain/xp'
import type { XpBreakdown } from '@/domain/xp'
import { updateStreak } from '@/domain/streak'
import type { StreakResult } from '@/domain/streak'
import { computeProgression } from '@/domain/progression'
import { evaluateAchievements } from '@/domain/achievements'
import type { AchievementDefinition } from '@/domain/achievements'
import type { AchievementState } from '@/domain/achievements'
import { getRankByNumber, getNextRank } from '@/domain/ranks'
import { todayString, subtractDays } from '@/lib/date'
import {
  db,
  getUserRepository,
  getWorkoutRepository,
  getAchievementRepository,
  getProgressionRepository,
} from '@/db'
import type { UserRepository, WorkoutRepository, AchievementRepository, ProgressionRepository } from '@/db'
import { useUserStore } from './useUserStore'
import { useProgressionStore } from './useProgressionStore'

// Rolling window for consistency / fatigue computation (calendar days)
const WINDOW_DAYS = 7

const DEFAULT_EXERCISE: WorkoutExercise = { pushups: 0, squats: 0, situps: 0, cardioKm: 0 }

type WorkoutState = {
  todayExercise: WorkoutExercise
  isCompleting: boolean
  lastXpBreakdown: XpBreakdown | null
  lastStreakResult: StreakResult | null
  newlyUnlocked: AchievementDefinition[]
}

type WorkoutActions = {
  setReps(update: Partial<WorkoutExercise>): void
  completeWorkout(): Promise<void>
  resetSession(): void
}

export type WorkoutStore = WorkoutState & WorkoutActions

type Deps = {
  userRepo: UserRepository
  workoutRepo: WorkoutRepository
  achievementRepo: AchievementRepository
  progressionRepo: ProgressionRepository
  getToday: () => string
}

export function createWorkoutStore(deps: Deps) {
  return create<WorkoutStore>()((set, get) => ({
    todayExercise: DEFAULT_EXERCISE,
    isCompleting: false,
    lastXpBreakdown: null,
    lastStreakResult: null,
    newlyUnlocked: [],

    setReps(update) {
      set((s) => ({ todayExercise: { ...s.todayExercise, ...update } }))
    },

    resetSession() {
      set({
        todayExercise: DEFAULT_EXERCISE,
        lastXpBreakdown: null,
        lastStreakResult: null,
        newlyUnlocked: [],
      })
    },

    async completeWorkout() {
      const today = deps.getToday()
      set({ isCompleting: true })

      try {
        // ── Read phase (parallel) ─────────────────────────────────────────────
        const [user, progression, allWorkouts, unlockedIds, totalPushups, totalSquats, totalSitups, totalCardioKm] =
          await Promise.all([
            deps.userRepo.get(),
            deps.progressionRepo.get(),
            deps.workoutRepo.getAll(),
            deps.achievementRepo.getUnlockedIds(),
            deps.workoutRepo.getTotalPushups(),
            deps.workoutRepo.getTotalSquats(),
            deps.workoutRepo.getTotalSitups(),
            deps.workoutRepo.getTotalCardioKm(),
          ])

        if (!user) {
          set({ isCompleting: false })
          return
        }

        const todayExercise = get().todayExercise
        const currentRank = getRankByNumber(user.rank)!
        const nextRank = getNextRank(user.rank)

        // ── 1. XP computed after achievements so the breakdown includes the
        //       achievement bonus; see step 4 below.

        // ── 2. Update streak ──────────────────────────────────────────────────
        const sortedAllDesc = [...allWorkouts].sort((a, b) => b.date.localeCompare(a.date))
        const lastDate = sortedAllDesc.find((w) => w.date < today)?.date ?? null
        const streakResult = updateStreak(user.streak, lastDate, today)

        // ── 3. Run progression engine ─────────────────────────────────────────
        const windowStart = subtractDays(today, WINDOW_DAYS)
        const windowWorkouts = allWorkouts.filter(
          (w) => w.date >= windowStart && w.date <= today,
        )
        const sortedWindowDesc = [...windowWorkouts].sort((a, b) =>
          b.date.localeCompare(a.date),
        )
        const recentCompletionRates = sortedWindowDesc.map((w) =>
          workoutCompletionRatio(w, currentRank.target),
        )
        const completionRate =
          recentCompletionRates.length > 0
            ? recentCompletionRates.reduce((s, r) => s + r, 0) / recentCompletionRates.length
            : 1
        const missedWorkouts = Math.max(0, WINDOW_DAYS - windowWorkouts.length)

        const progressionOutput = computeProgression({
          currentRank,
          nextRank,
          progressionFactor: progression?.progressionFactor ?? 0,
          completionRate,
          streakDays: streakResult.count,
          missedWorkouts,
          totalWorkoutsInWindow: WINDOW_DAYS,
          recentCompletionRates,
        })

        // ── 4. Evaluate achievements ──────────────────────────────────────────
        const newLongestStreak = Math.max(user.longestStreak ?? 0, streakResult.count)

        const achievementState: AchievementState = {
          totalWorkouts: allWorkouts.length + 1,
          totalPushups: totalPushups + todayExercise.pushups,
          totalSquats: totalSquats + todayExercise.squats,
          totalSitups: totalSitups + todayExercise.situps,
          totalCardioKm: totalCardioKm + todayExercise.cardioKm,
          currentStreak: streakResult.count,
          longestStreak: newLongestStreak,
          consistencyScore: progressionOutput.consistencyScore,
          rankNumber: user.rank,
        }

        const newAchievements = evaluateAchievements(unlockedIds, achievementState)

        // ── Finalize XP with achievement bonus ────────────────────────────────
        const finalXp = calculateWorkoutXp(todayExercise, currentRank.target, {
          streakDays: streakResult.count,
          newAchievements: newAchievements.length,
        })

        // ── 5. Persist all records ────────────────────────────────────────────
        const workout: Workout = {
          id: crypto.randomUUID(),
          date: today,
          pushups: todayExercise.pushups,
          squats: todayExercise.squats,
          situps: todayExercise.situps,
          cardioKm: todayExercise.cardioKm,
        }
        await deps.workoutRepo.add(workout)

        for (const a of newAchievements) {
          await deps.achievementRepo.add({
            id: a.id,
            title: a.title,
            description: a.description,
            unlockedAt: today,
          })
        }

        const newTotalXp = user.xp + finalXp.total
        const newLevel = levelFromTotalXp(newTotalXp)
        const newRankNumber =
          progressionOutput.shouldAdvanceRank && nextRank
            ? nextRank.rankNumber
            : user.rank

        const updatedUser: User = {
          ...user,
          xp: newTotalXp,
          level: newLevel,
          rank: newRankNumber,
          streak: streakResult.count,
          longestStreak: newLongestStreak,
        }
        await deps.userRepo.upsert(updatedUser)

        const updatedProgression: Progression = {
          currentRank: newRankNumber,
          consistencyScore: progressionOutput.consistencyScore,
          fatigueScore: progressionOutput.fatigueScore,
          progressionFactor: progressionOutput.nextProgressionFactor,
        }
        await deps.progressionRepo.upsert(updatedProgression)

        // ── 6. Update in-memory state ─────────────────────────────────────────
        set({
          isCompleting: false,
          lastXpBreakdown: finalXp,
          lastStreakResult: streakResult,
          newlyUnlocked: newAchievements,
          todayExercise: DEFAULT_EXERCISE,
        })

        useUserStore.getState().setUser(updatedUser)
        useProgressionStore.getState().setProgression(
          updatedProgression,
          progressionOutput.recommendation,
          progressionOutput.nextWorkout,
          progressionOutput.shouldAdvanceRank,
        )
      } catch (err) {
        set({ isCompleting: false })
        throw err
      }
    },
  }))
}

export const useWorkoutStore = createWorkoutStore({
  userRepo: getUserRepository(db),
  workoutRepo: getWorkoutRepository(db),
  achievementRepo: getAchievementRepository(db),
  progressionRepo: getProgressionRepository(db),
  getToday: todayString,
})
