import { describe, it, expect } from 'vitest'
import { RANKS, getRankByNumber, getNextRank, getRankWorkout } from './ranks'

// Canonical values from the PRD — any deviation here is a bug
const PRD_RANKS = [
  { rankNumber: 1, name: 'Civilian',       pushups: 5,   squats: 5,   situps: 5,   cardioKm: 0.5 },
  { rankNumber: 2, name: 'Trainee',        pushups: 10,  squats: 10,  situps: 10,  cardioKm: 1   },
  { rankNumber: 3, name: 'Fighter',        pushups: 20,  squats: 20,  situps: 20,  cardioKm: 2   },
  { rankNumber: 4, name: 'Hunter',         pushups: 35,  squats: 35,  situps: 35,  cardioKm: 3   },
  { rankNumber: 5, name: 'Elite',          pushups: 50,  squats: 50,  situps: 50,  cardioKm: 5   },
  { rankNumber: 6, name: 'Hero Candidate', pushups: 70,  squats: 70,  situps: 70,  cardioKm: 7   },
  { rankNumber: 7, name: 'Hero',           pushups: 85,  squats: 85,  situps: 85,  cardioKm: 8.5 },
  { rankNumber: 8, name: 'Caped Baldy',    pushups: 100, squats: 100, situps: 100, cardioKm: 10  },
] as const

describe('RANKS', () => {
  it('contains exactly 8 ranks', () => {
    expect(RANKS).toHaveLength(8)
  })

  it('is frozen at runtime', () => {
    expect(Object.isFrozen(RANKS)).toBe(true)
  })

  it('rank numbers are sequential starting at 1', () => {
    RANKS.forEach((rank, i) => {
      expect(rank.rankNumber).toBe(i + 1)
    })
  })

  it.each(PRD_RANKS)(
    'rank $rankNumber ($name) — reps/distance match PRD',
    ({ rankNumber, name, pushups, squats, situps, cardioKm }) => {
      const rank = RANKS[rankNumber - 1]
      expect(rank.rankNumber).toBe(rankNumber)
      expect(rank.name).toBe(name)
      expect(rank.target.pushups).toBe(pushups)
      expect(rank.target.squats).toBe(squats)
      expect(rank.target.situps).toBe(situps)
      expect(rank.target.cardioKm).toBe(cardioKm)
    },
  )
})

describe('getRankByNumber', () => {
  it.each(PRD_RANKS)('returns rank $rankNumber ($name) correctly', ({ rankNumber, name }) => {
    const rank = getRankByNumber(rankNumber)
    expect(rank).not.toBeNull()
    expect(rank!.name).toBe(name)
  })

  it('returns null for rank 0 (below minimum)', () => {
    expect(getRankByNumber(0)).toBeNull()
  })

  it('returns null for rank 9 (above maximum)', () => {
    expect(getRankByNumber(9)).toBeNull()
  })

  it('returns null for negative numbers', () => {
    expect(getRankByNumber(-1)).toBeNull()
  })
})

describe('getNextRank', () => {
  it('returns rank 2 (Trainee) after rank 1 (Civilian)', () => {
    const next = getNextRank(1)
    expect(next?.rankNumber).toBe(2)
    expect(next?.name).toBe('Trainee')
  })

  it('advances correctly through all 7 transitions', () => {
    for (let i = 1; i <= 7; i++) {
      expect(getNextRank(i)?.rankNumber).toBe(i + 1)
    }
  })

  it('returns null for rank 8 — Caped Baldy has no next rank', () => {
    expect(getNextRank(8)).toBeNull()
  })

  it('returns null when the resulting number exceeds 8', () => {
    expect(getNextRank(9)).toBeNull()
  })
})

describe('getRankWorkout', () => {
  it.each(PRD_RANKS)(
    'returns correct target for rank $rankNumber',
    ({ rankNumber, pushups, squats, situps, cardioKm }) => {
      const target = getRankWorkout(rankNumber)
      expect(target).not.toBeNull()
      expect(target!.pushups).toBe(pushups)
      expect(target!.squats).toBe(squats)
      expect(target!.situps).toBe(situps)
      expect(target!.cardioKm).toBe(cardioKm)
    },
  )

  it('Caped Baldy target is exactly 100/100/100/10km', () => {
    expect(getRankWorkout(8)).toEqual({
      pushups: 100,
      squats: 100,
      situps: 100,
      cardioKm: 10,
    })
  })

  it('returns null for rank 0', () => {
    expect(getRankWorkout(0)).toBeNull()
  })

  it('returns null for rank 9', () => {
    expect(getRankWorkout(9)).toBeNull()
  })
})
