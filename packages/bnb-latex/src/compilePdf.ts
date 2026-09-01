import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { LatexGenerationError } from './errors'
import type { CompilePdfInput, CompilePdfResult } from './types'

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_LATEX_BYTES = 512 * 1024
const OUTPUT_NAME_PATTERN = /^[A-Za-z0-9._-]+$/

function ensureSafeOutputBaseName(outputBaseName: string): string {
  if (!OUTPUT_NAME_PATTERN.test(outputBaseName)) {
    throw new LatexGenerationError(
      'INVALID_OUTPUT_NAME',
      `Invalid output base name "${outputBaseName}".`,
    )
  }

  const lowered = outputBaseName.toLowerCase()
  if (lowered.endsWith('.tex') || lowered.endsWith('.pdf')) {
    return outputBaseName.slice(0, outputBaseName.lastIndexOf('.'))
  }

  return outputBaseName
}

function truncateOutput(output: string, maxLen = 8000): string {
  if (output.length <= maxLen) {
    return output
  }
  return `${output.slice(0, maxLen)}\n...[truncated]`
}

function runCompiler(
  compilerCommand: string,
  cwd: string,
  texFileName: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-file-line-error',
      '-no-shell-escape',
      texFileName,
    ]

    const proc = spawn(compilerCommand, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    let finished = false
    const timer = setTimeout(() => {
      if (!finished) {
        proc.kill()
        reject(
          new LatexGenerationError(
            'PDF_TIMEOUT',
            `LaTeX compilation timed out after ${timeoutMs}ms.`,
          ),
        )
      }
    }, timeoutMs)

    proc.stdout.on('data', (chunk) => {
      output += chunk.toString('utf-8')
    })
    proc.stderr.on('data', (chunk) => {
      output += chunk.toString('utf-8')
    })

    proc.on('error', (err) => {
      finished = true
      clearTimeout(timer)
      const errorCode = (err as NodeJS.ErrnoException).code
      if (errorCode === 'ENOENT' || errorCode === 'EACCES') {
        reject(
          new LatexGenerationError(
            'PDF_COMPILER_MISSING',
            `LaTeX compiler "${compilerCommand}" was not found or is not executable.`,
          ),
        )
        return
      }
      reject(
        new LatexGenerationError(
          'PDF_COMPILE_FAILED',
          `Failed to start LaTeX compiler: ${err.message}`,
        ),
      )
    })

    proc.on('close', (exitCode) => {
      finished = true
      clearTimeout(timer)
      const trimmed = truncateOutput(output)
      if (exitCode !== 0) {
        reject(
          new LatexGenerationError(
            'PDF_COMPILE_FAILED',
            `LaTeX compiler exited with code ${exitCode}.\n${trimmed}`,
          ),
        )
        return
      }
      resolve(trimmed)
    })
  })
}

export async function compilePdf(
  input: CompilePdfInput,
): Promise<CompilePdfResult> {
  const maxLatexBytes = input.maxLatexBytes ?? DEFAULT_MAX_LATEX_BYTES
  if (Buffer.byteLength(input.latex, 'utf-8') > maxLatexBytes) {
    throw new LatexGenerationError(
      'INPUT_TOO_LARGE',
      `LaTeX input exceeds ${maxLatexBytes} bytes.`,
    )
  }

  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const compilerCommand = input.compilerCommand ?? 'pdflatex'
  const outputBaseName = ensureSafeOutputBaseName(
    input.outputBaseName ?? 'character-sheet',
  )

  const workDir = await mkdtemp(join(tmpdir(), 'bnb-latex-'))
  const texFileName = `${outputBaseName}.tex`
  const pdfFileName = `${outputBaseName}.pdf`
  const texPath = join(workDir, texFileName)
  const pdfPath = join(workDir, pdfFileName)

  try {
    await writeFile(texPath, input.latex, 'utf-8')
    const compilerOutput = await runCompiler(
      compilerCommand,
      workDir,
      texFileName,
      timeoutMs,
    )
    const pdfBuffer = await readFile(pdfPath)

    return {
      pdfBuffer,
      pdfFileName,
      compilerOutput,
    }
  } finally {
    if (!input.keepArtifacts) {
      await rm(workDir, { recursive: true, force: true })
    }
  }
}
