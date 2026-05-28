const KEYS = {
  theme: 'heropath:theme',
  onboarding: 'heropath:onboarding-complete',
  username: 'heropath:username',
} as const

export type Theme = 'dark' | 'light'

export const preferences = {
  getTheme(): Theme {
    const v = localStorage.getItem(KEYS.theme)
    return v === 'light' ? 'light' : 'dark'
  },

  setTheme(theme: Theme): void {
    localStorage.setItem(KEYS.theme, theme)
  },

  isOnboardingComplete(): boolean {
    return localStorage.getItem(KEYS.onboarding) === 'true'
  },

  setOnboardingComplete(value: boolean): void {
    localStorage.setItem(KEYS.onboarding, String(value))
  },

  getUsername(): string | null {
    return localStorage.getItem(KEYS.username)
  },

  setUsername(username: string): void {
    localStorage.setItem(KEYS.username, username)
  },

  clearUsername(): void {
    localStorage.removeItem(KEYS.username)
  },
}
