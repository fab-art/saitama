import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ASSESSMENT_QUESTIONS, startingRankFromAssessment } from '@/domain/assessment'
import type { AssessmentAnswer } from '@/domain/assessment'
import { preferences } from '@/db'
import { useUserStore } from '@/store'

// ─── Orchestration (exported for unit-testing without React) ─────────────────

export type CompletionDeps = {
  username: string
  answers: ReadonlyArray<AssessmentAnswer>
  createUser: (name: string, rank: number) => Promise<void>
  setOnboardingComplete: (v: boolean) => void
  navigate: (path: string, opts?: { replace: boolean }) => void
}

export async function completeOnboarding(deps: CompletionDeps): Promise<void> {
  const rank = startingRankFromAssessment(deps.answers)
  await deps.createUser(deps.username.trim() || 'Hero', rank)
  deps.setOnboardingComplete(true)
  deps.navigate('/dashboard', { replace: true })
}

// ─── Animation variants ───────────────────────────────────────────────────────

const slideVariants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { x: -40, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
}

// ─── Main component ───────────────────────────────────────────────────────────

type Phase = 'welcome' | 'wizard' | 'finishing'

// Wizard steps: 0 .. Q-1 are assessment questions, Q is username
const TOTAL_WIZARD_STEPS = ASSESSMENT_QUESTIONS.length + 1

export function OnboardingPage() {
  const navigate = useNavigate()
  const createUser = useUserStore((s) => s.createUser)

  const [phase, setPhase] = useState<Phase>('welcome')
  const [stepIdx, setStepIdx] = useState(0)
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([])
  const [username, setUsername] = useState('')

  const isUsernameStep = stepIdx === ASSESSMENT_QUESTIONS.length

  function handleOptionSelect(rankSuggestion: number) {
    const question = ASSESSMENT_QUESTIONS[stepIdx]
    setAnswers((prev) => [...prev, { questionId: question.id, rankSuggestion }])
    setStepIdx((i) => i + 1)
  }

  async function handleFinish() {
    setPhase('finishing')
    await completeOnboarding({
      username,
      answers,
      createUser,
      setOnboardingComplete: preferences.setOnboardingComplete.bind(preferences),
      navigate,
    })
  }

  // ── Welcome screen ─────────────────────────────────────────────────────────
  if (phase === 'welcome') {
    return (
      <div className="min-h-screen bg-void-900 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="mb-8 text-6xl select-none">⚡</div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Welcome to <span className="text-accent">HeroPath</span>
          </h1>
          <p className="text-void-300 text-lg mb-12 max-w-sm leading-relaxed">
            Train like a hero. Progress through 8 ranks on your way to becoming
            the&nbsp;Caped&nbsp;Baldy.
          </p>
          <button
            onClick={() => setPhase('wizard')}
            className="px-8 py-3.5 rounded-full bg-accent text-void-900 font-bold text-base
              shadow-glow-accent hover:brightness-110 active:scale-95
              transition-all duration-150"
          >
            Begin Your Journey
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Finishing screen ───────────────────────────────────────────────────────
  if (phase === 'finishing') {
    return (
      <div className="min-h-screen bg-void-900 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="text-5xl mb-4 select-none">🚀</div>
          <p className="text-white text-xl font-semibold">Creating your profile…</p>
        </motion.div>
      </div>
    )
  }

  // ── Wizard (assessment + username) ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-void-900 flex flex-col px-6 pt-14 pb-8">
      {/* Progress bar */}
      <div className="flex justify-center gap-2 mb-14">
        {Array.from({ length: TOTAL_WIZARD_STEPS }).map((_, i) => (
          <div
            key={i}
            className={[
              'h-1.5 rounded-full transition-all duration-300',
              i < stepIdx
                ? 'w-8 bg-accent'
                : i === stepIdx
                  ? 'w-8 bg-accent/50'
                  : 'w-2 bg-void-600',
            ].join(' ')}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIdx}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {isUsernameStep ? (
              <UsernameStep value={username} onChange={setUsername} onSubmit={handleFinish} />
            ) : (
              <QuestionStep
                question={ASSESSMENT_QUESTIONS[stepIdx]}
                stepNumber={stepIdx + 1}
                totalQuestions={ASSESSMENT_QUESTIONS.length}
                onSelect={handleOptionSelect}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Step sub-components ──────────────────────────────────────────────────────

type QuestionStepProps = {
  question: (typeof ASSESSMENT_QUESTIONS)[number]
  stepNumber: number
  totalQuestions: number
  onSelect: (rankSuggestion: number) => void
}

function QuestionStep({ question, stepNumber, totalQuestions, onSelect }: QuestionStepProps) {
  return (
    <div>
      <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-3">
        Question {stepNumber} of {totalQuestions}
      </p>
      <h2 className="text-2xl font-bold text-white mb-2 leading-snug">{question.text}</h2>
      <p className="text-void-400 text-sm mb-8">{question.subtext}</p>

      <div className="flex flex-col gap-3">
        {question.options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onSelect(opt.rankSuggestion)}
            className="w-full text-left px-5 py-4 rounded-xl border border-void-600
              bg-void-800 text-white font-medium text-sm
              hover:border-accent hover:bg-void-700 active:scale-[0.98]
              transition-all duration-150"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

type UsernameStepProps = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
}

function UsernameStep({ value, onChange, onSubmit }: UsernameStepProps) {
  return (
    <div>
      <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-3">
        Final step
      </p>
      <h2 className="text-2xl font-bold text-white mb-2 leading-snug">
        What should we call you?
      </h2>
      <p className="text-void-400 text-sm mb-8">
        Your hero name — stored locally on this device only.
      </p>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        placeholder="e.g. Saitama"
        maxLength={30}
        autoFocus
        className="w-full px-5 py-4 rounded-xl bg-void-800 border border-void-600
          text-white placeholder-void-500 text-sm font-medium mb-4
          focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50
          transition-all duration-150"
      />

      <button
        onClick={onSubmit}
        className="w-full py-4 rounded-xl bg-accent text-void-900 font-bold text-base
          shadow-glow-accent hover:brightness-110 active:scale-[0.98]
          transition-all duration-150"
      >
        {value.trim() ? 'Begin Training' : 'Begin as Hero'}
      </button>
    </div>
  )
}
