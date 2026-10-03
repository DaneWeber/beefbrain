import {
  DND35_DETAILED_PLAIN_TEMPLATE,
  DND35_DETAILED_TEMPLATE,
} from './dnd35/detailed'
import { DND35_QUICK_REFERENCE_TEMPLATE } from './dnd35/quickReference'
import { DND35_STAT_BLOCK_TEMPLATE } from './dnd35/statBlock'
import { DND35_SPELLCASTER_TEMPLATE } from './dnd35/spellcaster'
import { DND35_STREAMLINED_TEMPLATE } from './dnd35/streamlined'
import type { LatexTemplateKey, TemplateInfo } from '../types'

interface TemplateRecord {
  info: TemplateInfo
  template: string
}

const TEMPLATE_REGISTRY: Record<LatexTemplateKey, TemplateRecord> = {
  'dnd35-detailed': {
    info: {
      key: 'dnd35-detailed',
      name: 'D&D 3.5 Detailed',
      description: 'Expanded combat summary with saves and movement details.',
    },
    template: DND35_DETAILED_TEMPLATE,
  },
  'dnd35-detailed-plain': {
    info: {
      key: 'dnd35-detailed-plain',
      name: 'D&D 3.5 Detailed (no emoji)',
      description: 'The detailed sheet without emoji icons.',
    },
    template: DND35_DETAILED_PLAIN_TEMPLATE,
  },
  'dnd35-quick-reference': {
    info: {
      key: 'dnd35-quick-reference',
      name: 'D&D 3.5 Quick Reference',
      description:
        'One page, three columns: what a player looks up during a session.',
    },
    template: DND35_QUICK_REFERENCE_TEMPLATE,
  },
  'dnd35-stat-block': {
    info: {
      key: 'dnd35-stat-block',
      name: 'D&D 3.5 Stat Block',
      description:
        'One-page stat block in the style of the later 3.5 books, or for a companion.',
    },
    template: DND35_STAT_BLOCK_TEMPLATE,
  },
  'dnd35-streamlined': {
    info: {
      key: 'dnd35-streamlined',
      name: 'D&D 3.5 Streamlined',
      description: 'Play-session focused sheet with core stats and abilities.',
    },
    template: DND35_STREAMLINED_TEMPLATE,
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

export const DEFAULT_TEMPLATE_KEY: LatexTemplateKey = 'dnd35-detailed'

export function listTemplates(): TemplateInfo[] {
  return Object.values(TEMPLATE_REGISTRY).map((record) => record.info)
}

export function getTemplateRecord(key: LatexTemplateKey): TemplateRecord {
  return TEMPLATE_REGISTRY[key]
}
