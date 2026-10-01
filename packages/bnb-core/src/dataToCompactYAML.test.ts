import { describe, it, expect } from 'vitest'
import { dataToCompactYAML } from './dataToCompactYAML'

describe('dataToCompactYAML', () => {
  it('keeps special.senses on one line, quoting a sense with a comma', () => {
    const yaml = dataToCompactYAML({
      character: {
        special: {
          senses: ['Scent (30ft, 60ft downwind)', 'Low-light Vision'],
          languages: ['Common', 'Elven'],
        },
      },
    })
    expect(yaml).toContain(
      '    senses: ["Scent (30ft, 60ft downwind)", Low-light Vision]\n',
    )
    // Languages stay a block list, one to a line, as the data writes them.
    expect(yaml).toContain('    languages:\n      - Common\n      - Elven\n')
  })
})
