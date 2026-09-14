#!/usr/bin/env node

const { spawnSync } = require('child_process')

const result = spawnSync('lualatex', ['--version'], {
  encoding: 'utf-8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (result.error || result.status !== 0) {
  console.error('LaTeX compiler check failed: "lualatex" is not available in PATH.')
  console.error('Install a LaTeX distribution before using bnb PDF generation.')
  console.error('WSL (Ubuntu) example:')
  console.error(
    '  sudo apt install -y fontconfig texlive-latex-base texlive-latex-recommended texlive-luatex',
  )
  process.exit(1)
}

const firstLine = (result.stdout || '')
  .split('\n')
  .map((line) => line.trim())
  .find((line) => line.length > 0)

console.log(`lualatex detected: ${firstLine || 'version output unavailable'}`)
