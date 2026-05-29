import { describe, it, expect, vi } from 'vitest'
import type { MockedFunction } from 'vitest'
import { createWorkoutStore } from './useWorkoutStore'
import type { UserRepository, WorkoutRepository, AchievementRepository, ProgressionRepository } from '@/db'
import type { User, Workout, Progression } from '@/domain/types'
import { ACHIEVEMENT_CATALOG } from '@/domain/achievements'

// ─── Mock factory helpers ─────────────────────────────────────────────────────

const BASE_USER: User = {
  id: 'u1',
  username: 'Saitama',
  level: 1,
  xp: 0,
  rank: 1,
  streak: 0,
  longestStreak: 0,
}

const EMPTY_PROGRESSION: Progression = {
  currentRank: 1,
  consistencyScore: 0,
  fatigueScore: 0,
  progressionFactor: 0,
}

function makeUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    get: vi.fn().mockResolvedValue(BASE_USER),
    upsert: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeWorkoutRepo(overrides: Partial<WorkoutRepository> = {}): WorkoutRepository {
  return {
    add: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    getByDate: vi.fn().mockResolvedValue([]),
    getWorkoutsByDateRange: vi.fn().mockResolvedValue([]),
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    getTotalPushups: vi.fn().mockResolvedValue(0),
    getTotalSquats: vi.fn().mockResolvedValue(0),
    getTotalSitups: vi.fn().mockResolvedValue(0),
    getTotalCardioKm: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function makeAchievementRepo(overrides: Partial<AchievementRepository> = {}): AchievementRepository {
  return {
    add: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getUnlockedIds: vi.fn().mockResolvedValue([]),
    isUnlocked: vi.fn().mockResolvedValue(false),
    ...overrides,
  }
}

function makeProgressionRepo(overrides: Partial<ProgressionRepository> = {}): ProgressionRepository {
  return {
    get: vi.fn().mockResolvedValue(EMPTY_PROGRESSION),
    upsert: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeStore(
  overrides: {
    userRepo?: Partial<UserRepository>
    workoutRepo?: Partial<WorkoutRepository>
    achievementRepo?: Partial<AchievementRepository>
    progressionRepo?: Partial<ProgressionRepository>
    today?: string
  } = {},
) {
  return createWorkoutStore({
    userRepo: makeUserRepo(overrides.userRepo),
    workoutRepo: makeWorkoutRepo(overrides.workoutRepo),
    achievementRepo: makeAchievementRepo(overrides.achievementRepo),
    progressionRepo: makeProgressionRepo(overrides.progressionRepo),
    getToday: () => overrides.today ?? '2026-01-01',
  })
}

// ─── Sequence (persist ordering) ─────────────────────────────────────────────

describe('completeWorkout — persist sequence', () => {
  it('persists workout → achievements → user → progression in that order', async () => {
    const callOrder: string[] = []

    const store = createWorkoutStore({
      userRepo: {
        get: vi.fn().mockResolvedValue(BASE_USER),
        upsert: vi.fn().mockImplementation(async () => { callOrder.push('user.upsert') }),
      },
      workoutRepo: {
        add: vi.fn().mockImplementation(async () => { callOrder.push('workout.add') }),
        getAll: vi.fn().mockResolvedValue([]),
        getTotalPushups: vi.fn().mockResolvedValue(0),
        getTotalSquats: vi.fn().mockResolvedValue(0),
        getTotalSitups: vi.fn().mockResolvedValue(0),
        getTotalCardioKm: vi.fn().mockResolvedValue(0),
        getById: vi.fn(),
        getByDate: vi.fn(),
        getWorkoutsByDateRange: vi.fn(),
        delete: vi.fn(),
      },
      achievementRepo: {
        add: vi.fn().mockImplementation(async () => { callOrder.push('achievement.add') }),
        getAll: vi.fn().mockResolvedValue([]),
        getUnlockedIds: vi.fn().mockResolvedValue([]),
        isUnlocked: vi.fn(),
      },
      progressionRepo: {
        get: vi.fn().mockResolvedValue(EMPTY_PROGRESSION),
        upsert: vi.fn().mockImplementation(async () => { callOrder.push('progression.upsert') }),
      },
      getToday: () => '2026-01-01',
    })

    // Completing rank-1 targets exactly triggers first-workout achievement
    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    const workoutIdx = callOrder.indexOf('workout.add')
    const achievementIdx = callOrder.indexOf('achievement.add')
    const userIdx = callOrder.indexOf('user.upsert')
    const progressionIdx = callOrder.indexOf('progression.upsert')

    expect(workoutIdx).toBeGreaterThanOrEqual(0)
    expect(achievementIdx).toBeGreaterThanOrEqual(0)
    expect(userIdx).toBeGreaterThanOrEqual(0)
    expect(progressionIdx).toBeGreaterThanOrEqual(0)

    expect(workoutIdx).toBeLessThan(achievementIdx)
    expect(achievementIdx).toBeLessThan(userIdx)
    expect(userIdx).toBeLessThan(progressionIdx)
  })

  it('persists workout record even when no achievements are unlocked', async () => {
    const workoutRepo = makeWorkoutRepo()
    const achievementRepo = makeAchievementRepo({
      // all achievements already unlocked
      getUnlockedIds: vi.fn().mockResolvedValue(
        ACHIEVEMENT_CATALOG.map((a) => a.id),
      ),
    })

    const store = createWorkoutStore({
      userRepo: makeUserRepo(),
      workoutRepo,
      achievementRepo,
      progressionRepo: makeProgressionRepo(),
      getToday: () => '2026-01-01',
    })

    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    expect(workoutRepo.add).toHaveBeenCalledOnce()
    expect(achievementRepo.add).not.toHaveBeenCalled()
  })
})

// ─── XP computation ───────────────────────────────────────────────────────────

describe('completeWorkout — XP', () => {
  it('persists positive XP on the user record', async () => {
    const userRepo = makeUserRepo()
    const store = makeStore({ userRepo })
    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    const upserted = (userRepo.upsert as MockedFunction<UserRepository['upsert']>).mock.calls[0][0] as User
    expect(upserted.xp).toBeGreaterThan(0)
  })

  it('stores an itemized XP breakdown in lastXpBreakdown', async () => {
    const store = makeStore()
    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    const xp = store.getState().lastXpBreakdown!
    expect(xp.base).toBeGreaterThan(0)
    expect(xp.total).toBeGreaterThanOrEqual(xp.base)
  })

  it('achievement bonus inflates total XP when new achievements unlock', async () => {
    const storeNoAchievements = makeStore({
      achievementRepo: { getUnlockedIds: vi.fn().mockResolvedValue(ACHIEVEMENT_CATALOG.map((a) => a.id)) },
    })
    const storeWithAchievements = makeStore({
      achievementRepo: { getUnlockedIds: vi.fn().mockResolvedValue([]) },
    })

    const reps = { pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 }
    storeNoAchievements.getState().setReps(reps)
    storeWithAchievements.getState().setReps(reps)

    await storeNoAchievements.getState().completeWorkout()
    await storeWithAchievements.getState().completeWorkout()

    const xpBase = storeNoAchievements.getState().lastXpBreakdown!.total
    const xpWithBonus = storeWithAchievements.getState().lastXpBreakdown!.total
    expect(xpWithBonus).toBeGreaterThan(xpBase)
  })
})

// ─── Streak ───────────────────────────────────────────────────────────────────

describe('completeWorkout — streak', () => {
  it('sets streak to 1 on the very first workout', async () => {
    const userRepo = makeUserRepo()
    const store = makeStore({ userRepo })
    store.getState().setReps({ pushups: 1, squats: 1, situps: 1, cardioKm: 0.1 })
    await store.getState().completeWorkout()

    const upserted = (userRepo.upsert as MockedFunction<UserRepository['upsert']>).mock.calls[0][0] as User
    expect(upserted.streak).toBe(1)
    expect(store.getState().lastStreakResult?.status).toBe('incremented')
  })

  it('increments streak when last workout was yesterday', async () => {
    const userRepo = makeUserRepo({
      get: vi.fn().mockResolvedValue({ ...BASE_USER, streak: 3 }),
    })
    const workoutRepo = makeWorkoutRepo({
      getAll: vi.fn().mockResolvedValue([
        { id: 'w0', date: '2025-12-31', pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 },
      ] as Workout[]),
    })

    const store = createWorkoutStore({
      userRepo,
      workoutRepo,
      achievementRepo: makeAchievementRepo(),
      progressionRepo: makeProgressionRepo(),
      getToday: () => '2026-01-01',
    })

    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    const upserted = (userRepo.upsert as MockedFunction<UserRepository['upsert']>).mock.calls[0][0] as User
    expect(upserted.streak).toBe(4)
    expect(store.getState().lastStreakResult?.status).toBe('incremented')
  })

  it('updates longestStreak when current streak exceeds previous best', async () => {
    const userRepo = makeUserRepo({
      get: vi.fn().mockResolvedValue({ ...BASE_USER, streak: 6, longestStreak: 6 }),
    })
    const workoutRepo = makeWorkoutRepo({
      getAll: vi.fn().mockResolvedValue([
        { id: 'w0', date: '2025-12-31', pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 },
      ] as Workout[]),
    })

    const store = createWorkoutStore({
      userRepo,
      workoutRepo,
      achievementRepo: makeAchievementRepo(),
      progressionRepo: makeProgressionRepo(),
      getToday: () => '2026-01-01',
    })

    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    const upserted = (userRepo.upsert as MockedFunction<UserRepository['upsert']>).mock.calls[0][0] as User
    expect(upserted.longestStreak).toBe(7)
  })
})

// ─── Achievements ─────────────────────────────────────────────────────────────

describe('completeWorkout — achievements', () => {
  it('unlocks first-workout on the very first completed workout', async () => {
    const achievementRepo = makeAchievementRepo()
    const store = makeStore({ achievementRepo })

    store.getState().setReps({ pushups: 1, squats: 1, situps: 1, cardioKm: 0.1 })
    await store.getState().completeWorkout()

    const addCalls = (achievementRepo.add as MockedFunction<AchievementRepository['add']>).mock.calls
    const ids = addCalls.map((c) => c[0].id)
    expect(ids).toContain('first-workout')
    expect(store.getState().newlyUnlocked.map((a) => a.id)).toContain('first-workout')
  })

  it('persists achievement with today as unlockedAt', async () => {
    const achievementRepo = makeAchievementRepo()
    const store = createWorkoutStore({
      userRepo: makeUserRepo(),
      workoutRepo: makeWorkoutRepo(),
      achievementRepo,
      progressionRepo: makeProgressionRepo(),
      getToday: () => '2026-05-10',
    })

    store.getState().setReps({ pushups: 1, squats: 1, situps: 1, cardioKm: 0.1 })
    await store.getState().completeWorkout()

    const addCalls = (achievementRepo.add as MockedFunction<AchievementRepository['add']>).mock.calls
    const firstWorkout = addCalls.find((c) => c[0].id === 'first-workout')
    expect(firstWorkout?.[0].unlockedAt).toBe('2026-05-10')
  })

  it('does not re-unlock achievements already in unlockedIds', async () => {
    const achievementRepo = makeAchievementRepo({
      getUnlockedIds: vi.fn().mockResolvedValue(['first-workout']),
    })
    const store = makeStore({ achievementRepo })

    store.getState().setReps({ pushups: 1, squats: 1, situps: 1, cardioKm: 0.1 })
    await store.getState().completeWorkout()

    const addCalls = (achievementRepo.add as MockedFunction<AchievementRepository['add']>).mock.calls
    const ids = addCalls.map((c) => c[0].id)
    expect(ids).not.toContain('first-workout')
  })
})

// ─── Progression ──────────────────────────────────────────────────────────────

describe('completeWorkout — progression', () => {
  it('upserts progression record after every completion', async () => {
    const progressionRepo = makeProgressionRepo()
    const store = makeStore({ progressionRepo })

    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    expect(progressionRepo.upsert).toHaveBeenCalledOnce()
  })

  it('upserts progression with valid 0–1 score fields', async () => {
    const progressionRepo = makeProgressionRepo()
    const store = makeStore({ progressionRepo })

    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    const upserted = (progressionRepo.upsert as MockedFunction<ProgressionRepository['upsert']>).mock.calls[0][0] as Progression
    expect(upserted.consistencyScore).toBeGreaterThanOrEqual(0)
    expect(upserted.consistencyScore).toBeLessThanOrEqual(1)
    expect(upserted.fatigueScore).toBeGreaterThanOrEqual(0)
    expect(upserted.fatigueScore).toBeLessThanOrEqual(1)
    expect(upserted.progressionFactor).toBeGreaterThanOrEqual(0)
    expect(upserted.progressionFactor).toBeLessThanOrEqual(1)
  })

  it('advances rank when progression engine signals shouldAdvanceRank', async () => {
    // Use a user with high streak + progression factor near 1
    const userRepo = makeUserRepo({
      get: vi.fn().mockResolvedValue({
        ...BASE_USER,
        rank: 1,
        streak: 7,
        longestStreak: 7,
      }),
    })
    const progressionRepo = makeProgressionRepo({
      get: vi.fn().mockResolvedValue({
        ...EMPTY_PROGRESSION,
        progressionFactor: 0.95,
        consistencyScore: 0.9,
      }),
    })
    const workoutRepo = makeWorkoutRepo({
      // 14 recent perfect sessions to drive high consistency
      getAll: vi.fn().mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => ({
          id: `w${i}`,
          date: `2025-12-${String(25 + i).padStart(2, '0')}`,
          pushups: 5,
          squats: 5,
          situps: 5,
          cardioKm: 0.5,
        })) as Workout[],
      ),
      getTotalPushups: vi.fn().mockResolvedValue(35),
      getTotalSquats: vi.fn().mockResolvedValue(35),
      getTotalSitups: vi.fn().mockResolvedValue(35),
      getTotalCardioKm: vi.fn().mockResolvedValue(3.5),
    })

    const store = createWorkoutStore({
      userRepo,
      workoutRepo,
      achievementRepo: makeAchievementRepo(),
      progressionRepo,
      getToday: () => '2026-01-01',
    })

    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    const upserted = (userRepo.upsert as MockedFunction<UserRepository['upsert']>).mock.calls[0][0] as User
    expect(upserted.rank).toBe(2) // advanced from rank 1 → rank 2
  })
})

// ─── State after completion ───────────────────────────────────────────────────

describe('completeWorkout — in-memory state', () => {
  it('resets todayExercise to zeroes after completion', async () => {
    const store = makeStore()
    store.getState().setReps({ pushups: 10, squats: 10, situps: 10, cardioKm: 1 })
    await store.getState().completeWorkout()

    const { pushups, squats, situps, cardioKm } = store.getState().todayExercise
    expect(pushups).toBe(0)
    expect(squats).toBe(0)
    expect(situps).toBe(0)
    expect(cardioKm).toBe(0)
  })

  it('isCompleting is false after successful completion', async () => {
    const store = makeStore()
    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()
    expect(store.getState().isCompleting).toBe(false)
  })

  it('returns immediately without throwing when user does not exist', async () => {
    const store = createWorkoutStore({
      userRepo: makeUserRepo({ get: vi.fn().mockResolvedValue(null) }),
      workoutRepo: makeWorkoutRepo(),
      achievementRepo: makeAchievementRepo(),
      progressionRepo: makeProgressionRepo(),
      getToday: () => '2026-01-01',
    })

    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await expect(store.getState().completeWorkout()).resolves.toBeUndefined()
    expect(store.getState().isCompleting).toBe(false)
  })

  it('resetSession clears lastXpBreakdown and newlyUnlocked', async () => {
    const store = makeStore()
    store.getState().setReps({ pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 })
    await store.getState().completeWorkout()

    expect(store.getState().lastXpBreakdown).not.toBeNull()
    store.getState().resetSession()
    expect(store.getState().lastXpBreakdown).toBeNull()
    expect(store.getState().newlyUnlocked).toHaveLength(0)
  })
})

// ─── useUserStore and useProgressionStore — basic behaviour ──────────────────

describe('useUserStore', () => {
  it('createUser stores a user with correct initial shape', async () => {
    const { createUserStore } = await import('./useUserStore')
    const userRepo = makeUserRepo({ get: vi.fn().mockResolvedValue(null) })
    const store = createUserStore({ userRepo })
    await store.getState().createUser('Genos')

    const upserted = (userRepo.upsert as MockedFunction<UserRepository['upsert']>).mock.calls[0][0] as User
    expect(upserted.username).toBe('Genos')
    expect(upserted.level).toBe(1)
    expect(upserted.xp).toBe(0)
    expect(upserted.rank).toBe(1)
    expect(upserted.streak).toBe(0)
    expect(upserted.longestStreak).toBe(0)
    expect(store.getState().user?.username).toBe('Genos')
  })

  it('init loads user from repo into store state', async () => {
    const { createUserStore } = await import('./useUserStore')
    const store = createUserStore({ userRepo: makeUserRepo() })
    await store.getState().init()
    expect(store.getState().user).toEqual(BASE_USER)
  })
})

describe('useProgressionStore', () => {
  it('init loads progression from repo', async () => {
    const { createProgressionStore } = await import('./useProgressionStore')
    const store = createProgressionStore({ progressionRepo: makeProgressionRepo() })
    await store.getState().init()
    expect(store.getState().progression).toEqual(EMPTY_PROGRESSION)
  })

  it('setProgression updates all four fields atomically', async () => {
    const { createProgressionStore } = await import('./useProgressionStore')
    const store = createProgressionStore({ progressionRepo: makeProgressionRepo() })
    store.getState().setProgression(EMPTY_PROGRESSION, 'progress', { pushups: 7, squats: 7, situps: 7, cardioKm: 0.7 }, false)
    expect(store.getState().recommendation).toBe('progress')
    expect(store.getState().nextWorkout?.pushups).toBe(7)
  })
})
