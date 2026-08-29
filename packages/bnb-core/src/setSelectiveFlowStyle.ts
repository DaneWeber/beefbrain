import { YAMLSeq, YAMLMap } from 'yaml'

// Paths to apply flow style (wildcards supported for arrays)
const flowStylePaths = [
  'character.abilities.*',
  'character.levels.*',
  'character.combat.initiative',
  'character.combat.saves.*',
  'character.combat.attack.bab',
  'character.combat.attack.grapple',
  'character.combat.attack.melee.*',
  'character.combat.attack.ranged.*',
  'character.combat.defense.*',
  'character.movement.*',
  'character.movement.capacity',
  'character.skills.*',
  'character.special.feats.*',
  'character.inventory._on',
  'character.inventory.*.*',
  'character.spells.*.casting',
  'character.spells.*.domains',
  'character.spells.*.slots.*',
  'character.spells.*.prepared.*',
  'character.spells.*.known.*',
  'character.spells.*.spells-per-day',
  'character.spells.*.save-dc',
  'character.spells.*.spells-prepared.*',
  'character.spells.*.spells-known.*',
  'character.spells.*.spellbook.*',
  'character.templates.*.effects.abilities.*',
  'character.templates.*.effects.levels.*',
  'character.templates.*.effects.combat.initiative',
  'character.templates.*.effects.combat.saves.*',
  'character.templates.*.effects.combat.attack.melee.*',
  'character.templates.*.effects.combat.attack.ranged.*',
  'character.templates.*.effects.combat.defense.*',
  'character.templates.*.effects.skills.*',
  'character.companions.*.*',
]
export function setSelectiveFlowStyle(node: unknown, path: string[] = []) {
  for (const pattern of flowStylePaths) {
    const patternParts = pattern.split('.')
    const pathParts = path
    if (
      patternParts.length === pathParts.length &&
      patternParts.every((part, i) => part === '*' || part === pathParts[i])
    ) {
      if (node instanceof YAMLSeq || node instanceof YAMLMap) {
        node.flow = true
      }
      break
    }
  }
  if (node instanceof YAMLSeq) {
    node.items.forEach((item, idx) =>
      setSelectiveFlowStyle(item, [...path, idx.toString()]),
    )
  } else if (node instanceof YAMLMap) {
    node.items.forEach((item) => {
      if (item && item.key && item.value) {
        setSelectiveFlowStyle(item.value, [...path, String(item.key)])
      }
    })
  }
}
