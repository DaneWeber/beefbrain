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
