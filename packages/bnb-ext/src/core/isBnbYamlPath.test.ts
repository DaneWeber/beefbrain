import { describe, it, expect } from '@jest/globals'
import { isBnbYamlPath } from './isBnbYamlPath'

describe('isBnbYamlPath', () => {
  it('matches .bnb.yaml and .bnb.yml regardless of associateAllYaml', () => {
    expect(isBnbYamlPath('/chars/gimli.bnb.yaml', false)).toBe(true)
    expect(isBnbYamlPath('/chars/gimli.bnb.yml', false)).toBe(true)
    expect(isBnbYamlPath('/chars/GIMLI.BNB.YAML', false)).toBe(true)
  })

  it('does not match plain .yaml/.yml unless associateAllYaml is set', () => {
    expect(isBnbYamlPath('/chars/gimli.yaml', false)).toBe(false)
    expect(isBnbYamlPath('/chars/gimli.yml', false)).toBe(false)
    expect(isBnbYamlPath('/chars/gimli.yaml', true)).toBe(true)
    expect(isBnbYamlPath('/chars/gimli.yml', true)).toBe(true)
  })

  it('does not match unrelated extensions even with associateAllYaml', () => {
    expect(isBnbYamlPath('/chars/gimli.json', true)).toBe(false)
    expect(isBnbYamlPath('/chars/gimli.bnb.yaml.bak', true)).toBe(false)
  })
})
