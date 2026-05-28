import { describe, it, expect, beforeEach } from 'vitest'
import { preferences } from './preferences'

beforeEach(() => {
  localStorage.clear()
})

describe('preferences — theme', () => {
  it('defaults to "dark" when not set', () => {
    expect(preferences.getTheme()).toBe('dark')
  })

  it('round-trips "dark"', () => {
    preferences.setTheme('dark')
    expect(preferences.getTheme()).toBe('dark')
  })

  it('round-trips "light"', () => {
    preferences.setTheme('light')
    expect(preferences.getTheme()).toBe('light')
  })

  it('returns "dark" after setting then clearing storage', () => {
    preferences.setTheme('light')
    localStorage.clear()
    expect(preferences.getTheme()).toBe('dark')
  })
})

describe('preferences — onboarding', () => {
  it('defaults to false when not set', () => {
    expect(preferences.isOnboardingComplete()).toBe(false)
  })

  it('round-trips true', () => {
    preferences.setOnboardingComplete(true)
    expect(preferences.isOnboardingComplete()).toBe(true)
  })

  it('round-trips false', () => {
    preferences.setOnboardingComplete(true)
    preferences.setOnboardingComplete(false)
    expect(preferences.isOnboardingComplete()).toBe(false)
  })
})

describe('preferences — username', () => {
  it('returns null when not set', () => {
    expect(preferences.getUsername()).toBeNull()
  })

  it('round-trips a username', () => {
    preferences.setUsername('Saitama')
    expect(preferences.getUsername()).toBe('Saitama')
  })

  it('clearUsername removes the stored value', () => {
    preferences.setUsername('Genos')
    preferences.clearUsername()
    expect(preferences.getUsername()).toBeNull()
  })

  it('overwriting username replaces the old value', () => {
    preferences.setUsername('first')
    preferences.setUsername('second')
    expect(preferences.getUsername()).toBe('second')
  })
})
