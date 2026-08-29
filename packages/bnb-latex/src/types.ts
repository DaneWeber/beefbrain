export type LatexTemplateKey =
  | 'dnd35-streamlined'
  | 'dnd35-detailed'
  | 'dnd35-spellcaster'

export interface TemplateInfo {
  key: LatexTemplateKey
  name: string
  description: string
}

export interface RenderLatexInput {
  yaml: string
  templateKey?: LatexTemplateKey
  templateContent?: string
  maxYamlBytes?: number
  maxTemplateBytes?: number
}

export interface RenderLatexResult {
  latex: string
  template: TemplateInfo
}

export interface LatexFieldMap {
  [key: string]: string | number
}

export type LatexGenerationErrorCode =
  | 'INPUT_TOO_LARGE'
  | 'INVALID_YAML'
  | 'UNKNOWN_TEMPLATE'
  | 'INVALID_TEMPLATE'
