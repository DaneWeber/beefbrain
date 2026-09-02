export type LatexTemplateKey =
  'dnd35-streamlined' | 'dnd35-detailed' | 'dnd35-spellcaster'

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

export interface CompilePdfInput {
  latex: string
  timeoutMs?: number
  maxLatexBytes?: number
  outputBaseName?: string
  compilerCommand?: string
  keepArtifacts?: boolean
}

export interface CompilePdfResult {
  pdfBuffer: Buffer
  pdfFileName: string
  compilerOutput: string
}

export interface LatexFieldMap {
  [key: string]: string | number
}

export type LatexGenerationErrorCode =
  | 'INPUT_TOO_LARGE'
  | 'INVALID_YAML'
  | 'UNKNOWN_TEMPLATE'
  | 'INVALID_TEMPLATE'
  | 'INVALID_OUTPUT_NAME'
  | 'PDF_TIMEOUT'
  | 'PDF_COMPILER_MISSING'
  | 'PDF_COMPILE_FAILED'
