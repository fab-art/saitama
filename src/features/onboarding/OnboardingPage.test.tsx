import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ASSESSMENT_QUESTIONS } from '@/domain/assessment'

// vi.mock calls are hoisted by Vitest so these run before the imports below.

// Strip Framer Motion animations so AnimatePresence doesn't block child mounting
// in jsdom (where requestAnimationFrame-based exit animations never fire).
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

vi.mock('@/store', () => ({
  useUserStore: (selector: (s: { createUser: () => Promise<void> }) => unknown) =>
    selector({ createUser: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('@/db', () => ({
  preferences: {
    setOnboardingComplete: vi.fn(),
    isOnboardingComplete: vi.fn().mockReturnValue(false),
  },
}))

// Import OnboardingPage after mocks are declared (Vitest hoisting ensures mocks
// are active when the module is evaluated).
import { completeOnboarding, OnboardingPage } from './OnboardingPage'

// ─── completeOnboarding — unit tests (no React rendering needed) ──────────────

describe('completeOnboarding', () => {
  function makeDeps(
    overrides: Partial<Parameters<typeof completeOnboarding>[0]> = {},
  ) {
    return {
      username: 'Saitama',
      answers: [],
      createUser: vi.fn().mockResolvedValue(undefined),
      setOnboardingComplete: vi.fn(),
      navigate: vi.fn(),
      ...overrides,
    }
  }

  it('calls createUser with the derived rank from answers', async () => {
    const deps = makeDeps({
      username: 'Genos',
      answers: [
        { questionId: 'pushups', rankSuggestion: 3 },
        { questionId: 'cardio', rankSuggestion: 2 },
      ],
    })
    await completeOnboarding(deps)
    // min(3, 2) = 2
    expect(deps.createUser).toHaveBeenCalledWith('Genos', 2)
  })

  it('defaults to rank 1 with no answers (safe start)', async () => {
    const deps = makeDeps({ username: 'Saitama', answers: [] })
    await completeOnboarding(deps)
    expect(deps.createUser).toHaveBeenCalledWith('Saitama', 1)
  })

  it('uses "Hero" when username is blank', async () => {
    const deps = makeDeps({ username: '', answers: [] })
    await completeOnboarding(deps)
    expect(deps.createUser).toHaveBeenCalledWith('Hero', 1)
  })

  it('uses "Hero" when username is whitespace only', async () => {
    const deps = makeDeps({ username: '   ', answers: [] })
    await completeOnboarding(deps)
    expect(deps.createUser).toHaveBeenCalledWith('Hero', 1)
  })

  it('sets onboarding-complete flag to true', async () => {
    const deps = makeDeps()
    await completeOnboarding(deps)
    expect(deps.setOnboardingComplete).toHaveBeenCalledWith(true)
  })

  it('navigates to /dashboard with replace:true', async () => {
    const deps = makeDeps()
    await completeOnboarding(deps)
    expect(deps.navigate).toHaveBeenCalledWith('/dashboard', { replace: true })
  })

  it('always calls all three side-effects exactly once', async () => {
    const deps = makeDeps()
    await completeOnboarding(deps)
    expect(deps.createUser).toHaveBeenCalledOnce()
    expect(deps.setOnboardingComplete).toHaveBeenCalledOnce()
    expect(deps.navigate).toHaveBeenCalledOnce()
  })

  it('rank 1 answer in any position forces rank 1 (conservative)', async () => {
    const deps = makeDeps({
      answers: [
        { questionId: 'pushups', rankSuggestion: 4 },
        { questionId: 'cardio', rankSuggestion: 1 },
      ],
    })
    await completeOnboarding(deps)
    expect(deps.createUser).toHaveBeenCalledWith('Saitama', 1)
  })

  it('persists a valid profile: rank is 1–4, createUser called before navigate', async () => {
    const callOrder: string[] = []
    const deps = makeDeps({
      answers: [
        { questionId: 'pushups', rankSuggestion: 3 },
        { questionId: 'cardio', rankSuggestion: 3 },
      ],
      createUser: vi.fn().mockImplementation(async (_name: string, rank: number) => {
        expect(rank).toBeGreaterThanOrEqual(1)
        expect(rank).toBeLessThanOrEqual(4)
        callOrder.push('createUser')
      }),
      navigate: vi.fn().mockImplementation(() => {
        callOrder.push('navigate')
      }),
    })
    await completeOnboarding(deps)
    expect(callOrder).toEqual(['createUser', 'navigate'])
  })
})

// ─── OnboardingPage rendering smoke tests ─────────────────────────────────────

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  )
}

describe('OnboardingPage — rendering', () => {
  it('shows the welcome screen on first render', () => {
    renderOnboarding()
    expect(screen.getByText(/welcome to/i)).toBeInTheDocument()
    expect(screen.getByText(/begin your journey/i)).toBeInTheDocument()
  })

  it('advances to the first assessment question when "Begin" is clicked', () => {
    renderOnboarding()
    fireEvent.click(screen.getByText(/begin your journey/i))
    expect(screen.getByText(ASSESSMENT_QUESTIONS[0].text)).toBeInTheDocument()
  })

  it('shows question 2 after answering question 1', () => {
    renderOnboarding()
    fireEvent.click(screen.getByText(/begin your journey/i))
    // pick any option for question 1
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText(ASSESSMENT_QUESTIONS[1].text)).toBeInTheDocument()
  })

  it('shows the username step after all assessment questions are answered', () => {
    renderOnboarding()
    fireEvent.click(screen.getByText(/begin your journey/i))
    // answer all questions
    for (let i = 0; i < ASSESSMENT_QUESTIONS.length; i++) {
      fireEvent.click(screen.getAllByRole('button')[0])
    }
    expect(screen.getByPlaceholderText(/saitama/i)).toBeInTheDocument()
  })
})
