import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { RouteGuard } from './RouteGuard'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { WorkoutPage } from '@/features/workout/WorkoutPage'
import { AchievementsPage } from '@/features/achievements/AchievementsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root: redirect based on onboarding state */}
        <Route index element={<RouteGuard />} />

        {/* Onboarding — no persistent nav */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Authenticated shell — persistent nav */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Catch-all: back to root guard */}
        <Route path="*" element={<RouteGuard />} />
      </Routes>
    </BrowserRouter>
  )
}
