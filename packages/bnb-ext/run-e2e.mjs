// vscode-test downloads a real VS Code build and launches it, so it needs an X
// display and -- less obviously -- a D-Bus session bus. The devcontainer and CI
// have neither, so this wrapper puts the run under xvfb-run and
// dbus-run-session when -- and only when -- that is the case. A developer on a
// desktop OS has both already (and no xvfb-run at all, on macOS), and gets a
// plain vscode-test pointed at them.
//
// Keeping the decision here rather than in the npm script means `pnpm
// --filter bnb-ext test:e2e` is the one command that works everywhere; CI does
// not need its own xvfb-run wrapper, and neither do you.
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = dirname(fileURLToPath(import.meta.url))
const passthroughArgs = process.argv.slice(2)

// pnpm puts node_modules/.bin on PATH when it runs a script, but xvfb-run
// resolves its command itself and `node run-e2e.mjs` bypasses pnpm entirely.
// Prepending the bin directory keeps both of those working.
const binDir = join(packageDir, 'node_modules/.bin')
const env = {
  ...process.env,
  PATH: [binDir, process.env.PATH].filter(Boolean).join(delimiter),
}

const isInstalled = (bin) =>
  !spawnSync(bin, ['--help'], { stdio: 'ignore', env }).error

const hasXvfbRun = isInstalled('xvfb-run')
const useXvfbRun = !process.env.DISPLAY && hasXvfbRun

// Without a session bus, VS Code 1.138 logs three or four ERROR lines from
// dbus/bus.cc ("Could not parse server address: Unknown address type") and a
// failed org.freedesktop.DBus.NameHasOwner call before it gives up. Handing it
// a throwaway bus costs one process and removes all of them. (The *system* bus
// errors are separate and not fixable this way -- see .vscode-test.js.)
//
// Debian pulls dbus-run-session in as part of Playwright's chromium deps, so
// the devcontainer already has it; the check keeps this working on a machine
// that does not.
const hasDbusRunSession = isInstalled('dbus-run-session')
const useDbusRunSession =
  !process.env.DBUS_SESSION_BUS_ADDRESS && hasDbusRunSession

// VS Code 1.138 starts an "agent host" child process for its chat features
// during every test run. It contributes the bulk of the log noise -- the
// [ChatModelSelection], [AgentHost], and "Unknown channel:" lines, a
// DEP0169 `url.parse()` deprecation warning from inside VS Code's own code,
// and a handful of unauthenticated api.github.com lookups -- none of which
// this extension uses. Turning the feature off in the test profile drops all
// of it and takes about a second off the run.
//
// The path mirrors the default --user-data-dir that @vscode/test-electron
// passes (its cache directory, which is .vscode-test here). Seeding it on
// every run rather than committing it keeps working after `pnpm clean` and on
// a fresh clone, where .vscode-test does not exist yet; if a future
// @vscode/test-electron moves that directory, the only consequence is that
// the noise comes back.
const testProfileUserDir = join(packageDir, '.vscode-test/user-data/User')
mkdirSync(testProfileUserDir, { recursive: true })
writeFileSync(
  join(testProfileUserDir, 'settings.json'),
  `${JSON.stringify({ 'chat.disableAIFeatures': true }, null, 2)}\n`,
)

// -a picks a free display number instead of failing when :99 is already taken.
const argv = [
  ...(useDbusRunSession ? ['dbus-run-session', '--'] : []),
  ...(useXvfbRun ? ['xvfb-run', '-a'] : []),
  'vscode-test',
  ...passthroughArgs,
]
const [command, ...args] = argv

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
