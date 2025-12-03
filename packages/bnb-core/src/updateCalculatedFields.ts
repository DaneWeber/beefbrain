import { parse as parseYAML } from 'yaml'
import { dataToCompactYAML } from './dataToCompactYAML'
import type { Character, Abilities } from '.'

/**
 * Updates the calculated fields in a Beef Brain data file.
 * @param yamlContent - The YAML content to update
 * @returns Updated YAML content with calculated fields
 * @public
 */
export function updateCalculatedFields(yamlContent: string): string {
  const data = parseYAML(yamlContent)
  let hasChanges = false
  if (data.character === null) {
    return yamlContent
  }
  const character = data.character as Character

  // Ability score calculation logic (focus on strength)
  if (data.character?.abilities) {
    const abilities = data.character.abilities as Abilities
    hasChanges = calculateAbilityScores(character, hasChanges)

    // Movement carrying capacity update logic
    if (data.character?.movement?.capacity && abilities.strength) {
      let strengthScore: number | undefined
      if (Array.isArray(abilities.strength)) {
        strengthScore = abilities.strength[0]
      }
      if (typeof strengthScore === 'number') {
        // Official D&D 3.5e carrying capacity table for STR 1–29
        const heavyTable = [
          10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 150, 175, 200, 230,
          260, 300, 350, 400, 460, 520, 600, 700, 800, 920, 1040, 1200, 1400,
        ]
        let heavy = 10
        if (strengthScore >= 1 && strengthScore <= 29) {
          heavy = heavyTable[strengthScore - 1] ?? 10
        } else if (strengthScore >= 30) {
          // For STR 30+, every +10 doubles the heavy load from STR 20
          const base = 400 // STR 20 heavy load
          const extra = strengthScore - 20
          const factor = Math.floor(extra / 10)
          heavy = base * Math.pow(2, factor)
          // For scores between multiples of 10, scale proportionally
          const remainder = extra % 10
          if (remainder > 0) {
            // Use next doubling as upper bound
            const nextHeavy = base * Math.pow(2, factor + 1)
            heavy = Math.floor(heavy + (nextHeavy - heavy) * (remainder / 10))
          }
        }
        const medium = Math.floor((2 * heavy) / 3)
        const light = Math.floor(heavy / 3)
        const lift = heavy * 2
        const drag = heavy * 5
        const cap = data.character.movement.capacity
        if (cap.light !== `${light} lbs`) {
          cap.light = `${light} lbs`
          hasChanges = true
        }
        if (cap.medium !== `${medium} lbs`) {
          cap.medium = `${medium} lbs`
          hasChanges = true
        }
        if (cap.heavy !== `${heavy} lbs`) {
          cap.heavy = `${heavy} lbs`
          hasChanges = true
        }
        if (cap.lift !== `${lift} lbs`) {
          cap.lift = `${lift} lbs`
          hasChanges = true
        }
        if (cap.drag !== `${drag} lbs`) {
          cap.drag = `${drag} lbs`
          hasChanges = true
        }
      }
    }
    // ...existing code...
    // Combat update logic: propagate recalculated strength modifier to melee attacks and weapons
    if (data.character?.combat?.attack && abilities.strength) {
      // Always recalculate strength modifier from score
      let strengthMod: number | undefined
      if (Array.isArray(abilities.strength)) {
        const score = abilities.strength[0]
        if (typeof score === 'number') {
          strengthMod = Math.floor((score - 10) / 2)
        }
      }
      if (typeof strengthMod === 'number') {
        // Update generic melee attack
        const melee = data.character.combat.attack.melee
        if (melee && melee._ && Array.isArray(melee._) && melee._.length >= 2) {
          const [currentValue, modifiers] = melee._ as [
            number,
            Record<string, number>,
          ]
          if (modifiers && typeof modifiers === 'object') {
            if (modifiers.str !== strengthMod) {
              modifiers.str = strengthMod
              hasChanges = true
            }
            // Recalculate melee attack value
            let newValue = 0
            for (const value of Object.values(modifiers)) {
              newValue += typeof value === 'number' ? value : 0
            }
            if (currentValue !== newValue) {
              melee._[0] = newValue
              hasChanges = true
            }
          }
        }
        // Update named melee weapons
        for (const [weaponName, weaponArr] of Object.entries(melee)) {
          if (weaponName === '_') continue
          if (Array.isArray(weaponArr) && weaponArr.length >= 5) {
            // weaponArr[4] is usually the str modifier object
            const strObj = weaponArr[4]
            if (strObj && typeof strObj === 'object' && 'str' in strObj) {
              if (strObj.str !== strengthMod) {
                strObj.str = strengthMod
                hasChanges = true
              }
            }
            // Propagate generic melee bonus to weaponArr[3]._
            if (
              melee._ &&
              Array.isArray(melee._) &&
              typeof melee._[0] === 'number'
            ) {
              if (weaponArr[3] && typeof weaponArr[3] === 'object') {
                if (weaponArr[3]._ !== melee._[0]) {
                  weaponArr[3]._ = melee._[0]
                  hasChanges = true
                }
              }
            }
            // Sum all numeric values in weaponArr[3] for total attack bonus
            let atkBonus = 0
            if (weaponArr[3] && typeof weaponArr[3] === 'object') {
              for (const value of Object.values(weaponArr[3])) {
                atkBonus += typeof value === 'number' ? value : 0
              }
            }
            if (typeof weaponArr[0] === 'number' && weaponArr[0] !== atkBonus) {
              weaponArr[0] = atkBonus
              hasChanges = true
            }
            // Update weapon damage string (e.g., '1d8+2 slashing')
            if (typeof weaponArr[1] === 'string') {
              weaponArr[1] = weaponArr[1].replace(
                /1d8\+[0-9]+/,
                `1d8+${strengthMod}`,
              )
              hasChanges = true
            }
          }
        }

        // Update grapple
        const grappleArr = data.character.combat.attack.grapple
        if (Array.isArray(grappleArr) && grappleArr.length >= 2) {
          const [currentValue, modifiers] = grappleArr as [
            number,
            Record<string, number>,
          ]
          if (modifiers && typeof modifiers === 'object') {
            if (modifiers.str !== strengthMod) {
              modifiers.str = strengthMod
              hasChanges = true
            }
            // Recalculate grapple value
            let newValue = 0
            for (const value of Object.values(modifiers)) {
              newValue += typeof value === 'number' ? value : 0
            }
            if (currentValue !== newValue) {
              grappleArr[0] = newValue
              hasChanges = true
            }
          }
        }
      }
    }
    // ...existing code...
    // Skill update logic: propagate strength modifier to strength-based skills
    if (data.character?.skills && abilities.strength) {
      // Always recalculate strength modifier from score
      let strengthMod: number | undefined
      if (Array.isArray(abilities.strength)) {
        const score = abilities.strength[0]
        if (typeof score === 'number') {
          strengthMod = Math.floor((score - 10) / 2)
        }
      }
      // List of strength-based skills in D&D 3.5e
      const strengthSkills = ['climb', 'jump', 'swim']
      if (typeof strengthMod === 'number') {
        for (const [skillName, skillArr] of Object.entries(
          data.character.skills,
        )) {
          if (Array.isArray(skillArr) && skillArr.length >= 2) {
            const [currentValue, modifiers] = skillArr as [
              number,
              Record<string, number>,
            ]
            if (
              modifiers &&
              typeof modifiers === 'object' &&
              (strengthSkills.includes(skillName) || 'str' in modifiers)
            ) {
              // Always set str modifier for strength-based skills
              if (modifiers.str !== strengthMod) {
                modifiers.str = strengthMod
                hasChanges = true
              }
              // Recalculate skill value
              let newValue = 0
              for (const value of Object.values(modifiers)) {
                newValue += typeof value === 'number' ? value : 0
              }
              if (currentValue !== newValue) {
                skillArr[0] = newValue
                hasChanges = true
              }
            }
          }
        }
      }
    }
  }

  // If changes were made, reformat and return
  if (hasChanges) {
    return dataToCompactYAML(data)
  }
  return yamlContent
}

function calculateAbilityScores(character: Character, hasChanges: boolean) {
  for (const [abilityName, abilityArr] of Object.entries(character.abilities)) {
    if (Array.isArray(abilityArr)) {
      const [currentScore, modifierData, calculationDetails] = abilityArr
      let totalScore = currentScore || 0

      // If calculation details are present, use them to recalculate score
      // If only [score, {mod}] is present, recalculate modifier from score
      if (
        calculationDetails &&
        typeof calculationDetails === 'object' &&
        typeof calculationDetails.base === 'number'
      ) {
        totalScore = sumOfValues(calculationDetails)
      }

      if (currentScore !== totalScore) {
        abilityArr[0] = totalScore
        hasChanges = true
      }

      const modifier = Math.floor((totalScore - 10) / 2)

      if (typeof modifierData === 'object' && modifierData !== null) {
        const firstKey = Object.keys(modifierData)[0]
        if (firstKey && modifierData[firstKey] !== modifier) {
          abilityArr[1] = { [firstKey]: modifier }
          hasChanges = true
        }
      }
    }
  }
  return hasChanges
}

function sumOfValues(obj: Record<string, number>): number {
  return Object.values(obj).reduce((sum, val) => sum + val, 0)
}
