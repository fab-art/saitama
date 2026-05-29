import { Navigate } from 'react-router-dom'
import { preferences } from '@/db'

/** Redirects to /dashboard if onboarding is complete, otherwise /onboarding. */
export function RouteGuard() {
  const dest = preferences.isOnboardingComplete() ? '/dashboard' : '/onboarding'
  return <Navigate to={dest} replace />
}
