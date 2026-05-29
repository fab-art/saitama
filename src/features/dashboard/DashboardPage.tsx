import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUserStore, useProgressionStore } from '@/store'
import { getRankByNumber, getNextRank } from '@/domain/ranks'
import { xpForLevel } from '@/domain/xp'
import type { WorkoutExercise } from '@/domain/types'

// ─── Rank colour palette (mirrors tailwind.config rank tokens) ────────────────

const RANK_HEX: Record<number, string> = {
  1: '#6b7280', // civilian
  2: '#10b981', // trainee
  3: '#3b82f6', // fighter
  4: '#8b5cf6', // hunter
  5: '#f59e0b', // elite
  6: '#ef4444', // candidate
  7: '#ec4899', // hero
  8: '#e2e8f0', // caped baldy
}

const RANK_ICON: Record<number, string> = {
  1: '🤸', 2: '🏃', 3: '⚔️', 4: '🏹',
  5: '⭐', 6: '🦸', 7: '👊', 8: '⚡',
}

// ─── Framer Motion variants ───────────────────────────────────────────────────

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()

  // Granular selectors — each re-renders only when its slice changes
  const username   = useUserStore((s) => s.user?.username ?? 'Hero')
  const level      = useUserStore((s) => s.user?.level    ?? 1)
  const totalXp    = useUserStore((s) => s.user?.xp       ?? 0)
  const rankNumber = useUserStore((s) => s.user?.rank     ?? 1)
  const streak     = useUserStore((s) => s.user?.streak   ?? 0)
  const nextWorkout = useProgressionStore((s) => s.nextWorkout)

  // Display-layer derivations using pure domain functions (no business rules)
  const currentRank  = getRankByNumber(rankNumber)
  const nextRankData = getNextRank(rankNumber)
  const rankColor    = RANK_HEX[rankNumber] ?? '#6b7280'
  const rankIcon     = RANK_ICON[rankNumber] ?? '⚡'

  const levelFloor   = xpForLevel(level)
  const levelCeiling = xpForLevel(level + 1)
  const xpInLevel    = Math.max(0, totalXp - levelFloor)
  const xpSpan       = levelCeiling - levelFloor
  const xpProgress   = xpSpan > 0 ? Math.min(xpInLevel / xpSpan, 1) : 1

  // Today's recommended workout; fall back to current rank baseline
  const todayWorkout: WorkoutExercise =
    nextWorkout ?? currentRank?.target ?? { pushups: 5, squats: 5, situps: 5, cardioKm: 0.5 }

  return (
    <div className="min-h-full px-4 pt-6 pb-8 max-w-lg mx-auto">
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4"
      >
        {/* ── Header: name + streak ───────────────────────────────────────── */}
        <motion.div variants={item} className="flex items-start justify-between">
          <div>
            <p className="text-void-500 text-[11px] uppercase tracking-widest mb-0.5">
              Welcome back
            </p>
            <h1 className="text-2xl font-bold text-white">{username}</h1>
          </div>

          {streak > 0 && (
            <div className="flex flex-col items-center bg-void-800 border border-void-600 rounded-2xl px-4 py-2.5 gap-0.5">
              <span className="text-xl leading-none select-none">🔥</span>
              <span className="text-white font-bold text-xl leading-none tabular-nums">
                {streak}
              </span>
              <span className="text-void-500 text-[10px] uppercase tracking-wide">streak</span>
            </div>
          )}
        </motion.div>

        {/* ── Rank + Level card ───────────────────────────────────────────── */}
        <motion.div
          variants={item}
          className="rounded-2xl border bg-void-800 p-5 relative overflow-hidden"
          style={{ borderColor: `${rankColor}50` }}
        >
          {/* Ambient glow from rank colour */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 30% 0%, ${rankColor}, transparent 70%)`,
            }}
          />

          <div className="relative flex items-center justify-between">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: rankColor }}
              >
                {currentRank?.name ?? 'Civilian'}
              </p>
              <p className="text-5xl font-extrabold text-white tracking-tight">
                {level}
                <span className="text-2xl font-semibold text-void-400 ml-1">lvl</span>
              </p>
            </div>

            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 shrink-0"
              style={{
                borderColor: rankColor,
                boxShadow: `0 0 20px ${rankColor}50`,
              }}
            >
              <span role="img" aria-label={currentRank?.name}>{rankIcon}</span>
            </div>
          </div>
        </motion.div>

        {/* ── XP progress bar ─────────────────────────────────────────────── */}
        <motion.div variants={item} className="rounded-2xl bg-void-800 border border-void-700 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-void-300 text-sm font-medium">Experience</span>
            <span className="text-xp text-sm font-bold tabular-nums">
              {xpInLevel.toLocaleString()}
              <span className="text-void-500 font-normal"> / {xpSpan.toLocaleString()} XP</span>
            </span>
          </div>

          {/* Track */}
          <div className="h-2.5 rounded-full bg-void-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full origin-left"
              style={{
                background: 'linear-gradient(90deg, #ffd700 0%, #ffed4a 100%)',
                boxShadow: '0 0 10px rgba(255,215,0,0.55)',
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: xpProgress }}
              transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.35 }}
            />
          </div>

          <p className="text-void-500 text-xs mt-2">
            {nextRankData
              ? `${Math.max(0, levelCeiling - totalXp).toLocaleString()} XP to Level ${level + 1}`
              : 'Maximum level reached'}
          </p>
        </motion.div>

        {/* ── Today's training ────────────────────────────────────────────── */}
        <motion.div variants={item} className="rounded-2xl bg-void-800 border border-void-700 p-5">
          <p className="text-void-500 text-[11px] uppercase tracking-widest mb-4">
            Today's Training
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Push-ups"  value={todayWorkout.pushups}  unit="reps" />
            <StatCard label="Squats"    value={todayWorkout.squats}   unit="reps" />
            <StatCard label="Sit-ups"   value={todayWorkout.situps}   unit="reps" />
            <StatCard label="Cardio"    value={todayWorkout.cardioKm} unit="km"   />
          </div>
        </motion.div>

        {/* ── Start Workout CTA ───────────────────────────────────────────── */}
        <motion.div variants={item}>
          <button
            onClick={() => navigate('/workout')}
            className="w-full py-4 rounded-2xl font-bold text-lg text-void-900
              bg-accent shadow-glow-accent
              hover:brightness-110 active:scale-[0.98]
              transition-all duration-150 flex items-center justify-center gap-2"
          >
            <span aria-hidden>⚡</span>
            Start Workout
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-void-900 rounded-xl px-4 py-3">
      <p className="text-void-500 text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-2xl leading-none tabular-nums">
        {value}
        <span className="text-void-500 text-xs font-normal ml-1">{unit}</span>
      </p>
    </div>
  )
}
