import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ─── Framer Motion: strip animations so motion.div renders immediately ────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// ─── React Router: capture navigate calls ─────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// ─── Store: mutable mock object, selectors delegate to it ────────────────────

type MockState = {
  user: {
    username: string
    level: number
    xp: number
    rank: number
    streak: number
  } | null
  nextWorkout: { pushups: number; squats: number; situps: number; cardioKm: number } | null
}

const MOCK: MockState = {
  user: {
    username: 'Genos',
    level: 5,
    xp: 1500,
    rank: 3,
    streak: 7,
  },
  nextWorkout: null,
}

vi.mock('@/store', () => ({
  useUserStore: (selector: (s: { user: MockState['user'] }) => unknown) =>
    selector({ user: MOCK.user }),
  useProgressionStore: (selector: (s: { nextWorkout: MockState['nextWorkout'] }) => unknown) =>
    selector({ nextWorkout: MOCK.nextWorkout }),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { DashboardPage } from './DashboardPage'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderDashboard() {
  return render(<DashboardPage />)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardPage — store values', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    MOCK.user = {
      username: 'Genos',
      level: 5,
      xp: 1500,
      rank: 3,
      streak: 7,
    }
    MOCK.nextWorkout = null
  })

  it('renders the username from the store', () => {
    renderDashboard()
    expect(screen.getByText('Genos')).toBeInTheDocument()
  })

  it('renders the level number', () => {
    renderDashboard()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders the rank name for rank 3 (Fighter)', () => {
    renderDashboard()
    expect(screen.getByText('Fighter')).toBeInTheDocument()
  })

  it('shows the streak badge when streak > 0', () => {
    renderDashboard()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('streak')).toBeInTheDocument()
  })

  it('hides the streak badge when streak is 0', () => {
    MOCK.user = { ...MOCK.user!, streak: 0 }
    renderDashboard()
    expect(screen.queryByText('streak')).not.toBeInTheDocument()
  })

  it("renders today's training from nextWorkout when available", () => {
    MOCK.nextWorkout = { pushups: 30, squats: 30, situps: 30, cardioKm: 3 }
    renderDashboard()
    // push-ups, squats, sit-ups all show 30; cardio shows 3
    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('falls back to rank target when nextWorkout is null (rank 3 = 20/20/20, 2km)', () => {
    MOCK.nextWorkout = null
    MOCK.user = { ...MOCK.user!, rank: 3 }
    renderDashboard()
    // Fighter rank target: 20 reps, 2 km
    const twenties = screen.getAllByText('20')
    expect(twenties.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows rank 2 name (Trainee) when rank is 2', () => {
    MOCK.user = { ...MOCK.user!, rank: 2 }
    renderDashboard()
    expect(screen.getByText('Trainee')).toBeInTheDocument()
  })

  it('renders "Today\'s Training" section header', () => {
    renderDashboard()
    expect(screen.getByText(/today's training/i)).toBeInTheDocument()
  })

  it('renders all four exercise labels', () => {
    renderDashboard()
    expect(screen.getByText('Push-ups')).toBeInTheDocument()
    expect(screen.getByText('Squats')).toBeInTheDocument()
    expect(screen.getByText('Sit-ups')).toBeInTheDocument()
    expect(screen.getByText('Cardio')).toBeInTheDocument()
  })

  it('does not crash when user is null (uses safe defaults)', () => {
    MOCK.user = null
    expect(() => renderDashboard()).not.toThrow()
    // Default username "Hero" should appear
    expect(screen.getByText('Hero')).toBeInTheDocument()
  })

  it('renders "Welcome back" label', () => {
    renderDashboard()
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
  })
})

describe('DashboardPage — navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    MOCK.user = {
      username: 'Saitama',
      level: 1,
      xp: 0,
      rank: 1,
      streak: 0,
    }
    MOCK.nextWorkout = null
  })

  it('clicking "Start Workout" navigates to /workout', () => {
    renderDashboard()
    fireEvent.click(screen.getByText(/start workout/i))
    expect(mockNavigate).toHaveBeenCalledWith('/workout')
  })

  it('calls navigate exactly once per click', () => {
    renderDashboard()
    fireEvent.click(screen.getByText(/start workout/i))
    expect(mockNavigate).toHaveBeenCalledOnce()
  })
})
