import { Document } from 'yaml'
import { BeefBrainData, YAMLdoc } from '.'
import { setSelectiveFlowStyle } from './setSelectiveFlowStyle'
import { stripSingleKeyBraces } from './stripSingleKeyBraces'

export function dataToCompactYAML(data: BeefBrainData): YAMLdoc {
  const doc = new Document(data)
  // Recursively set flow style only for schema-defined paths
  setSelectiveFlowStyle(doc.contents)

  // Convert to string with no line length restriction and no flow collection padding
  let result = doc.toString({
    lineWidth: 0,
    flowCollectionPadding: false,
    directives: true,
  }) as YAMLdoc

  // Strip curly braces from single-key maps in flow-style arrays, however
  // deeply nested, e.g. [14, {str: 2}] => [14, str: 2] and
  // [1/day, {dc: [19, {base: 13, cha: 6}]}] => [1/day, dc: [19, {base: 13, cha: 6}]],
  // but leave multi-key (and empty) maps untouched.
  result = stripSingleKeyBraces(result) as YAMLdoc

  return result
}
