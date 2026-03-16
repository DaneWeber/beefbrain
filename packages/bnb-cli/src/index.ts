import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  validateBeefBrainData,
  updateCalculatedFields,
} from 'bnb-core'

function printUsage(): void {
  console.log(`Usage: bnb <file.yaml> [options]

Options:
  --calc    Calculate derived fields and print to stdout
  --write   Calculate derived fields and update the file in place
  --help    Show this help message

With no options, validates and prints the formatted file to stdout.`)
}

function main(): void {
  const args = process.argv.slice(2)

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
      console.error(`Error: Cannot read file "${file}": ${(err as Error).message}`)
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
        console.error(
          `Error writing file "${file}": ${(err as Error).message}`,
        )
        process.exit(1)
      }
    } else {
      process.stdout.write(output)
    }
  }
}

main()
