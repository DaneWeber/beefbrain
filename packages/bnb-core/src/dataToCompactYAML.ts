import { Document } from 'yaml'
import { BeefBrainData, YAMLdoc } from '.'
import { setSelectiveFlowStyle } from './setSelectiveFlowStyle'

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

  // Strip curly braces from single-key maps in flow-style arrays
  // e.g. [14, {str: 2}] => [14, str: 2], but leave multi-key maps untouched
  result = result.replace(/\{([^:}]+):\s([^},]+)\}/g, '$1: $2') as YAMLdoc

  return result
}
