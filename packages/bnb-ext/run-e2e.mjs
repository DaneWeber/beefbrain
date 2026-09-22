// vscode-test downloads a real VS Code build and launches it, so it needs an X
// display. The devcontainer and CI have none, so this wrapper puts the run
// under xvfb-run when -- and only when -- that is the case. A developer on a
// desktop OS has a display (and no xvfb-run at all, on macOS), and gets a
// plain vscode-test pointed at it.
//
// Keeping the decision here rather than in the npm script means `pnpm
// --filter bnb-ext test:e2e` is the one command that works everywhere; CI does
// not need its own xvfb-run wrapper, and neither do you.
import { spawnSync } from 'node:child_process'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const passthroughArgs = process.argv.slice(2)

// pnpm puts node_modules/.bin on PATH when it runs a script, but xvfb-run
// resolves its command itself and `node run-e2e.mjs` bypasses pnpm entirely.
// Prepending the bin directory keeps both of those working.
const binDir = join(
  dirname(fileURLToPath(import.meta.url)),
  'node_modules/.bin',
)
const env = {
  ...process.env,
  PATH: [binDir, process.env.PATH].filter(Boolean).join(delimiter),
}

const hasXvfbRun = !spawnSync('xvfb-run', ['--help'], { stdio: 'ignore', env })
  .error
const useXvfbRun = !process.env.DISPLAY && hasXvfbRun

// -a picks a free display number instead of failing when :99 is already taken.
const [command, args] = useXvfbRun
  ? ['xvfb-run', ['-a', 'vscode-test', ...passthroughArgs]]
  : ['vscode-test', passthroughArgs]

const result = spawnSync(command, args, { stdio: 'inherit', env })

if (result.error) {
  const hint =
    !process.env.DISPLAY && !hasXvfbRun
      ? ' (no DISPLAY and no xvfb-run -- install xvfb, or rebuild the devcontainer)'
      : ''
  console.error(`Failed to run ${command}${hint}: ${result.error.message}`)
  process.exit(1)
}

if (result.signal) {
  console.error(`${command} was terminated by signal ${result.signal}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
