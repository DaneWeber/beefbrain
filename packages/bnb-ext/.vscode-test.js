const { defineConfig } = require('@vscode/test-cli')

module.exports = defineConfig({
  files: 'out/test/**/*.test.js',
  launchArgs: [
    '--disable-extensions',
    // There is no GPU in the devcontainer or in CI, so Electron's GPU process
    // starts, fails to get a command buffer, and logs
    // "ContextResult::kTransientFailure" plus a pair of mesa shader-cache
    // complaints on the way. Nothing in these tests renders anything we assert
    // on, so skipping the GPU process outright is cheaper and quieter.
    '--disable-gpu',
    // Chromium's own stderr logging, at FATAL only (0=INFO, 3=FATAL). Without
    // this, every run prints ~8 ERROR lines from dbus/bus.cc and
    // dbus/object_proxy.cc: the container has no *system* bus, so Electron
    // cannot reach org.freedesktop.login1 to take a sleep inhibitor.
    // dbus-run-session in run-e2e.mjs supplies a session bus and silences the
    // rest; there is no equivalent for the system bus short of running
    // systemd, so the remaining lines get filtered here instead.
    //
    // This does hide genuine Chromium-level errors too. Test failures still
    // surface through Mocha and the exit code, but if you are chasing a
    // renderer crash rather than a test failure, drop this flag first.
    //
    // VS Code's CLI does not recognize the flag and says so ("not in the list
    // of known options, but still passed to Electron/Chromium") -- that one
    // warning line is the trade for the eight it removes.
    '--log-level=3',
  ],
})
