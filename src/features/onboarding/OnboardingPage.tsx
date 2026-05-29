import { useNavigate } from 'react-router-dom'
import { preferences } from '@/db'

export function OnboardingPage() {
  const navigate = useNavigate()

  function handleStart() {
    preferences.setOnboardingComplete(true)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-void-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-8">
        <span className="text-6xl">⚡</span>
      </div>

      <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
        Welcome to <span className="text-accent">HeroPath</span>
      </h1>

      <p className="text-void-300 text-lg mb-12 max-w-sm leading-relaxed">
        Train like a hero. Progress through 8 ranks on your way to becoming&nbsp;the&nbsp;Caped Baldy.
      </p>

      <button
        onClick={handleStart}
        className="px-8 py-3.5 rounded-full bg-accent text-void-900 font-bold text-base
          shadow-glow-accent hover:brightness-110 active:scale-95
          transition-all duration-150"
      >
        Begin Your Journey
      </button>

      <p className="mt-6 text-void-500 text-sm">More setup options coming soon</p>
    </div>
  )
}
