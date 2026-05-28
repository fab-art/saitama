export type WorkoutExercise = {
  pushups: number
  squats: number
  situps: number
  cardioKm: number
}

export type Workout = {
  id: string
  date: string // YYYY-MM-DD
} & WorkoutExercise

export type Rank = {
  rankNumber: number
  name: string
  target: WorkoutExercise
}

export type User = {
  id: string
  username: string
  level: number
  xp: number
  rank: number // 1–8
  streak: number
}

export type Achievement = {
  id: string
  title: string
  description: string
  unlockedAt: string | null // ISO date string, null = locked
}

export type Progression = {
  currentRank: number
  consistencyScore: number // 0–1
  fatigueScore: number // 0–1
}
