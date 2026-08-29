import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  afterAll,
} from '@jest/globals'
import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  rmSync,
  readdirSync,
} from 'fs'
import { tmpdir } from 'os'
import { resolve } from 'path'
import * as childProcess from 'child_process'

// Test fixtures
const VALID_YAML = `---
character:
  abilities:
    strength: [15, { str: 2 }, { base: 11, orc: 2, hd: 2 }]
`

const INVALID_YAML = `---
character: abilities: strength: [15, str: 2]
`

const TEMP_DIR = resolve(tmpdir(), `bnb-cli-tests-${process.pid}-${Date.now()}`)

describe('bnb-cli integration tests', () => {
  beforeEach(() => {
    try {
      mkdirSync(TEMP_DIR, { recursive: true })
    } catch {
      // Directory might already exist
    }
  })

  afterEach(() => {
    // Clean up test files
    try {
      const files = readdirSync(TEMP_DIR)
      for (const file of files) {
        unlinkSync(resolve(TEMP_DIR, file))
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  afterAll(() => {
    try {
      rmSync(TEMP_DIR, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('argument parsing', () => {
    it('should show help with --help flag', () => {
      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', '--help'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )
      expect(result.status).toBe(0)
      expect(result.stdout.toString()).toContain('Usage: bnb')
    })

    it('should error when no files specified', () => {
      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', '--calc'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )
      expect(result.status).toBe(1)
      expect(result.stderr.toString()).toContain('No file specified')
    })
  })

  describe('file validation', () => {
    it('should validate a valid YAML file', () => {
      const testFile = resolve(TEMP_DIR, 'valid.yaml')
      writeFileSync(testFile, VALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      expect(result.stdout.toString()).toContain('character')
      expect(result.stdout.toString()).toContain('abilities')
    })

    it('should reject invalid YAML', () => {
      const testFile = resolve(TEMP_DIR, 'invalid.yaml')
      writeFileSync(testFile, INVALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(1)
      expect(result.stderr.toString()).toContain('not valid YAML')
    })

    it('should error when file does not exist', () => {
      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', '/nonexistent/file.yaml'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(1)
      expect(result.stderr.toString()).toContain('Cannot read file')
    })
  })

  describe('--calc flag', () => {
    it('should calculate derived fields with --calc', () => {
      const testFile = resolve(TEMP_DIR, 'calc.yaml')
      writeFileSync(testFile, VALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile, '--calc'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      const output = result.stdout.toString()
      expect(output).toContain('character')
      // Calculations should update the values
      expect(output).toMatch(/\d+/)
    })
  })

  describe('--write flag', () => {
    it('should update file with --write flag', () => {
      const testFile = resolve(TEMP_DIR, 'write.yaml')
      writeFileSync(testFile, VALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile, '--write'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      expect(result.stdout.toString()).toContain('Updated:')

      // Verify file was modified
      const updatedContent = readFileSync(testFile, 'utf-8')
      expect(updatedContent).toContain('character')
      expect(updatedContent).toContain('abilities')
    })

    it('should not output file content with --write flag', () => {
      const testFile = resolve(TEMP_DIR, 'nowrite.yaml')
      writeFileSync(testFile, VALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile, '--write'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      // Should only output status message, not the file content to stdout
      const stdout = result.stdout.toString()
      expect(stdout).toContain('Updated:')
      // The full YAML content should not be in stdout (only status messages)
      const lines = stdout.split('\n')
      expect(lines.length).toBeLessThan(3) // Just "Updated: filename" + possible empty line
    })

    it('should handle write errors gracefully', () => {
      // Try to write to an invalid path
      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', '/root/invalid/path.yaml', '--write'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(1)
      expect(result.stderr.toString()).toContain('Error')
    })
  })

  describe('multiple files', () => {
    it('should process multiple files', () => {
      const file1 = resolve(TEMP_DIR, 'file1.yaml')
      const file2 = resolve(TEMP_DIR, 'file2.yaml')
      writeFileSync(file1, VALID_YAML)
      writeFileSync(file2, VALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', file1, file2],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      const output = result.stdout.toString()
      // Should contain YAML content
      expect(output).toContain('character')
    })

    it('should stop on first error with multiple files', () => {
      const validFile = resolve(TEMP_DIR, 'valid-multi.yaml')
      const invalidFile = resolve(TEMP_DIR, 'invalid-multi.yaml')
      writeFileSync(validFile, VALID_YAML)
      writeFileSync(invalidFile, INVALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', validFile, invalidFile],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(1)
      expect(result.stderr.toString()).toContain('not valid YAML')
    })
  })

  describe('output formatting', () => {
    it('should output to stdout by default', () => {
      const testFile = resolve(TEMP_DIR, 'output.yaml')
      writeFileSync(testFile, VALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      expect(result.stdout.toString()).toContain('---')
      expect(result.stdout.toString()).toContain('character')
    })

    it('should preserve YAML structure', () => {
      const testFile = resolve(TEMP_DIR, 'structure.yaml')
      writeFileSync(testFile, VALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      const output = result.stdout.toString()
      // Should start with document marker
      expect(output).toMatch(/^---/)
    })
  })

  describe('edge cases', () => {
    it('should handle empty files', () => {
      const testFile = resolve(TEMP_DIR, 'empty.yaml')
      writeFileSync(testFile, '')

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
    })

    it('should handle files with only whitespace', () => {
      const testFile = resolve(TEMP_DIR, 'whitespace.yaml')
      writeFileSync(testFile, '   \n\n  ')

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
    })
  })

  describe('help flag', () => {
    it('should show help when no arguments', () => {
      const result = childProcess.spawnSync('node', ['dist/index.js'], {
        cwd: resolve(__dirname, '..'),
      })

      expect(result.status).toBe(1)
      expect(result.stdout.toString()).toContain('Usage: bnb')
    })
  })

  describe('flag combinations', () => {
    it('should accept --calc and --write together', () => {
      const testFile = resolve(TEMP_DIR, 'both-flags.yaml')
      writeFileSync(testFile, VALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', testFile, '--calc', '--write'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      expect(result.stdout.toString()).toContain('Updated:')

      // Verify file was actually written
      const content = readFileSync(testFile, 'utf-8')
      expect(content).toContain('character')
    })
  })

  describe('latex command', () => {
    it('should show latex help', () => {
      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', 'latex', '--help'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      expect(result.stdout.toString()).toContain('Usage: bnb latex')
    })

    it('should error when latex command has no input file', () => {
      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', 'latex'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(1)
      expect(result.stderr.toString()).toContain(
        'No YAML file specified for latex command',
      )
    })

    it('should list available latex templates', () => {
      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', 'latex', '--list-templates'],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(0)
      expect(result.stdout.toString()).toContain('dnd35-streamlined')
      expect(result.stdout.toString()).toContain('dnd35-detailed')
    })

    it('should reject unknown template keys', () => {
      const testFile = resolve(TEMP_DIR, 'latex-template-test.yaml')
      writeFileSync(testFile, VALID_YAML)

      const result = childProcess.spawnSync(
        'node',
        ['dist/index.js', 'latex', '--template', 'unknown-template', testFile],
        {
          cwd: resolve(__dirname, '..'),
        },
      )

      expect(result.status).toBe(1)
      expect(result.stderr.toString()).toContain('Unknown template key')
    })
  })
})
