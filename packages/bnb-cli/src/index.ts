import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, resolve } from 'path'
import { compilePdf, listTemplates, renderLatex } from 'bnb-latex'
import type { LatexTemplateKey } from 'bnb-latex'
import { validateBeefBrainData, updateCalculatedFields } from 'bnb-core'

function printUsage(): void {
  console.log(`Usage: bnb <file.yaml> [options]

Options:
  --calc    Calculate derived fields and print to stdout
  --write   Calculate derived fields and update the file in place
  latex     Generate LaTeX/PDF character sheets
  --help    Show this help message

With no options, validates and prints the formatted file to stdout.`)
}

function printLatexUsage(): void {
  console.log(`Usage: bnb latex <file.yaml> [options]

Options:
  --template <key>         Built-in template key (default: dnd35-streamlined)
  --template-file <path>   Custom .tex template file
  --out <path>             Output .tex path (default: <file>.tex)
  --pdf                    Compile PDF in addition to .tex output
  --pdf-out <path>         Output .pdf path (default: <out>.pdf)
  --list-templates         Print available built-in template keys
  --help                   Show this help message`)
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx === -1) {
    return undefined
  }
  const value = args[idx + 1]
  if (!value || value.startsWith('--')) {
    console.error(`Error: Missing value for ${flag}`)
    process.exit(1)
  }
  return value
}

function getPositionalArgs(
  args: string[],
  flagsWithValues: Set<string>,
): string[] {
  const positional: string[] = []
  for (let i = 0; i < args.length; i += 1) {
    const item = args[i]
    if (item.startsWith('--')) {
      if (flagsWithValues.has(item)) {
        i += 1
      }
      continue
    }
    positional.push(item)
  }
  return positional
}

function toTexPath(sourcePath: string): string {
  const ext = extname(sourcePath)
  if (!ext) {
    return `${sourcePath}.tex`
  }
  return `${sourcePath.slice(0, -ext.length)}.tex`
}

function toPdfPath(texPath: string): string {
  const ext = extname(texPath)
  if (!ext) {
    return `${texPath}.pdf`
  }
  return `${texPath.slice(0, -ext.length)}.pdf`
}

function assertTexPath(pathValue: string): void {
  if (extname(pathValue).toLowerCase() !== '.tex') {
    console.error(`Error: --out must end in .tex. Received "${pathValue}".`)
    process.exit(1)
  }
}

function assertPdfPath(pathValue: string): void {
  if (extname(pathValue).toLowerCase() !== '.pdf') {
    console.error(`Error: --pdf-out must end in .pdf. Received "${pathValue}".`)
    process.exit(1)
  }
}

async function runLatexCommand(rawArgs: string[]): Promise<void> {
  if (rawArgs.includes('--help')) {
    printLatexUsage()
    return
  }

  if (rawArgs.includes('--list-templates')) {
    for (const template of listTemplates()) {
      console.log(`${template.key}: ${template.description}`)
    }
    return
  }

  const flags = rawArgs.filter((arg) => arg.startsWith('--'))
  const flagsWithValues = new Set([
    '--template',
    '--template-file',
    '--out',
    '--pdf-out',
  ])
  const files = getPositionalArgs(rawArgs, flagsWithValues)
  const inputFile = files[0]
  if (!inputFile) {
    console.error('Error: No YAML file specified for latex command.')
    printLatexUsage()
    process.exit(1)
  }

  const templateKey = getFlagValue(rawArgs, '--template')
  const templateFile = getFlagValue(rawArgs, '--template-file')
  const outPath = getFlagValue(rawArgs, '--out') ?? toTexPath(inputFile)
  const doPdf = flags.includes('--pdf')
  const pdfOutPath = getFlagValue(rawArgs, '--pdf-out') ?? toPdfPath(outPath)

  if (templateKey && templateFile) {
    console.error(
      'Error: Use either --template or --template-file, not both in one command.',
    )
    process.exit(1)
  }

  assertTexPath(outPath)
  if (flags.includes('--pdf-out') || doPdf) {
    assertPdfPath(pdfOutPath)
  }

  let yamlContent: string
  try {
    yamlContent = readFileSync(resolve(inputFile), 'utf-8')
  } catch (err) {
    console.error(
      `Error: Cannot read file "${inputFile}": ${(err as Error).message}`,
    )
    process.exit(1)
  }

  let templateContent: string | undefined
  if (templateFile) {
    if (extname(templateFile).toLowerCase() !== '.tex') {
      console.error(
        `Error: --template-file must point to a .tex file. Received "${templateFile}".`,
      )
      process.exit(1)
    }
    try {
      templateContent = readFileSync(resolve(templateFile), 'utf-8')
    } catch (err) {
      console.error(
        `Error: Cannot read template file "${templateFile}": ${(err as Error).message}`,
      )
      process.exit(1)
    }
  }

  try {
    const availableTemplateKeys = new Set(listTemplates().map((t) => t.key))
    if (
      templateKey &&
      !availableTemplateKeys.has(templateKey as LatexTemplateKey)
    ) {
      console.error(`Error: Unknown template key "${templateKey}".`)
      process.exit(1)
    }

    const result = renderLatex({
      yaml: yamlContent,
      templateKey: templateKey as LatexTemplateKey | undefined,
      templateContent,
    })

    writeFileSync(resolve(outPath), result.latex, 'utf-8')
    console.log(`Generated LaTeX: ${outPath}`)

    if (doPdf) {
      const pdfOutput = await compilePdf({
        latex: result.latex,
        outputBaseName: basename(pdfOutPath, '.pdf'),
      })
      writeFileSync(resolve(pdfOutPath), pdfOutput.pdfBuffer)
      console.log(`Generated PDF: ${pdfOutPath}`)
    }
  } catch (err) {
    console.error(`Error generating LaTeX/PDF: ${(err as Error).message}`)
    process.exit(1)
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args[0] === 'latex') {
    await runLatexCommand(args.slice(1))
    return
  }

  if (args.includes('--help') || args.length === 0) {
    printUsage()
    process.exit(args.includes('--help') ? 0 : 1)
  }

  const flags = args.filter((a) => a.startsWith('--'))
  const files = args.filter((a) => !a.startsWith('--'))

  if (files.length === 0) {
    console.error('Error: No file specified.')
    printUsage()
    process.exit(1)
  }

  const doCalc = flags.includes('--calc') || flags.includes('--write')
  const doWrite = flags.includes('--write')

  for (const file of files) {
    const filePath = resolve(file)
    let content: string

    try {
      content = readFileSync(filePath, 'utf-8')
    } catch (err) {
      console.error(
        `Error: Cannot read file "${file}": ${(err as Error).message}`,
      )
      process.exit(1)
    }

    if (!validateBeefBrainData(content)) {
      console.error(`Error: "${file}" is not valid YAML.`)
      process.exit(1)
    }

    let output = content
    if (doCalc) {
      try {
        output = updateCalculatedFields(content)
      } catch (err) {
        console.error(
          `Error calculating fields for "${file}": ${(err as Error).message}`,
        )
        process.exit(1)
      }
    }

    if (doWrite) {
      try {
        writeFileSync(filePath, output, 'utf-8')
        console.log(`Updated: ${file}`)
      } catch (err) {
        console.error(`Error writing file "${file}": ${(err as Error).message}`)
        process.exit(1)
      }
    } else {
      process.stdout.write(output)
    }
  }
}

main().catch((err) => {
  console.error(`Unexpected CLI error: ${(err as Error).message}`)
  process.exit(1)
})
