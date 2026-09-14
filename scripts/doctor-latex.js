#!/usr/bin/env node

const { spawnSync } = require('child_process')

const result = spawnSync('pdflatex', ['--version'], {
  encoding: 'utf-8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (result.error || result.status !== 0) {
  console.error('LaTeX compiler check failed: "pdflatex" is not available in PATH.')
  console.error('Install a LaTeX distribution before using bnb PDF generation.')
  console.error('WSL (Ubuntu/Debian) example -- texlive-latex-base is the whole')
  console.error('requirement; the templates only load geometry and array:')
  console.error('  sudo apt install -y texlive-latex-base')
  process.exit(1)
}

const firstLine = (result.stdout || '')
  .split('\n')
  .map((line) => line.trim())
  .find((line) => line.length > 0)

console.log(`pdflatex detected: ${firstLine || 'version output unavailable'}`)
