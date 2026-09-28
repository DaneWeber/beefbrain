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
    '  sudo apt install -y fontconfig fonts-noto-color-emoji texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-luatex',
  )
  process.exit(1)
}

const firstLine = (result.stdout || '')
  .split('\n')
  .map((line) => line.trim())
  .find((line) => line.length > 0)

console.log(`lualatex detected: ${firstLine || 'version output unavailable'}`)

// The Detailed template needs adjustbox, which ships in texlive-latex-extra
// rather than the base or recommended packages.
const adjustbox = spawnSync('kpsewhich', ['adjustbox.sty'], {
  encoding: 'utf-8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (adjustbox.error || adjustbox.status !== 0 || !adjustbox.stdout.trim()) {
  console.error('LaTeX package check failed: "adjustbox.sty" is not installed.')
  console.error('WSL (Ubuntu) example:')
  console.error('  sudo apt install -y texlive-latex-extra')
  process.exit(1)
}

console.log(`adjustbox detected: ${adjustbox.stdout.trim()}`)

// The Detailed template draws skill icons with the emoji package, which needs
// the Noto Color Emoji system font.
const emojiFont = spawnSync('fc-list', ['Noto Color Emoji'], {
  encoding: 'utf-8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (emojiFont.error || emojiFont.status !== 0 || !emojiFont.stdout.trim()) {
  console.error('Font check failed: "Noto Color Emoji" is not installed.')
  console.error('WSL (Ubuntu) example:')
  console.error('  sudo apt install -y fonts-noto-color-emoji')
  process.exit(1)
}

console.log('Noto Color Emoji detected')
