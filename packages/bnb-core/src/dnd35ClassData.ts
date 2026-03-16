/**
 * D&D 3.5e class progression data
 * BAB: 'good' = level, 'average' = floor(level*3/4), 'poor' = floor(level/2)
 * Saves: 'good' = 2 + floor(level/2), 'poor' = floor(level/3)
 */

type Progression = 'good' | 'average' | 'poor'

export interface ClassProgression {
  bab: Progression
  fort: Progression
  ref: Progression
  will: Progression
  hd: number
  skillPoints: number
}

export const CLASS_DATA: Record<string, ClassProgression> = {
  barbarian: { bab: 'good', fort: 'good', ref: 'poor', will: 'poor', hd: 12, skillPoints: 4 },
  bard: { bab: 'average', fort: 'poor', ref: 'good', will: 'good', hd: 6, skillPoints: 6 },
  cleric: { bab: 'average', fort: 'good', ref: 'poor', will: 'good', hd: 8, skillPoints: 2 },
  druid: { bab: 'average', fort: 'good', ref: 'poor', will: 'good', hd: 8, skillPoints: 4 },
  fighter: { bab: 'good', fort: 'good', ref: 'poor', will: 'poor', hd: 10, skillPoints: 2 },
  monk: { bab: 'average', fort: 'good', ref: 'good', will: 'good', hd: 8, skillPoints: 4 },
  paladin: { bab: 'good', fort: 'good', ref: 'poor', will: 'poor', hd: 10, skillPoints: 2 },
  ranger: { bab: 'good', fort: 'good', ref: 'good', will: 'poor', hd: 8, skillPoints: 6 },
  rogue: { bab: 'average', fort: 'poor', ref: 'good', will: 'poor', hd: 6, skillPoints: 8 },
  sorcerer: { bab: 'poor', fort: 'poor', ref: 'poor', will: 'good', hd: 4, skillPoints: 2 },
  wizard: { bab: 'poor', fort: 'poor', ref: 'poor', will: 'good', hd: 4, skillPoints: 2 },
}

export function calculateBab(progression: Progression, level: number): number {
  switch (progression) {
    case 'good': return level
    case 'average': return Math.floor(level * 3 / 4)
    case 'poor': return Math.floor(level / 2)
  }
}

export function calculateBaseSave(progression: Progression, level: number): number {
  switch (progression) {
    case 'good': return 2 + Math.floor(level / 2)
    case 'poor': return Math.floor(level / 3)
    default: return 0
  }
}
