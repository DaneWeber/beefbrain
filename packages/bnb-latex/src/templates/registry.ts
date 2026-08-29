import { DND35_DETAILED_TEMPLATE } from './dnd35/detailed'
import { DND35_SPELLCASTER_TEMPLATE } from './dnd35/spellcaster'
import { DND35_STREAMLINED_TEMPLATE } from './dnd35/streamlined'
import type { LatexTemplateKey, TemplateInfo } from '../types'

interface TemplateRecord {
  info: TemplateInfo
  template: string
}

const TEMPLATE_REGISTRY: Record<LatexTemplateKey, TemplateRecord> = {
  'dnd35-streamlined': {
    info: {
      key: 'dnd35-streamlined',
      name: 'D&D 3.5 Streamlined',
      description: 'Play-session focused sheet with core stats and abilities.',
    },
    template: DND35_STREAMLINED_TEMPLATE,
  },
  'dnd35-detailed': {
    info: {
      key: 'dnd35-detailed',
      name: 'D&D 3.5 Detailed',
      description: 'Expanded combat summary with saves and movement details.',
    },
    template: DND35_DETAILED_TEMPLATE,
  },
  'dnd35-spellcaster': {
    info: {
      key: 'dnd35-spellcaster',
      name: 'D&D 3.5 Spellcaster',
      description: 'Caster-friendly summary with core casting ability focus.',
    },
    template: DND35_SPELLCASTER_TEMPLATE,
  },
}

export const DEFAULT_TEMPLATE_KEY: LatexTemplateKey = 'dnd35-streamlined'

export function listTemplates(): TemplateInfo[] {
  return Object.values(TEMPLATE_REGISTRY).map((record) => record.info)
}

export function getTemplateRecord(key: LatexTemplateKey): TemplateRecord {
  return TEMPLATE_REGISTRY[key]
}
