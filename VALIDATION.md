# MVP verification — 2026-09-07

Environment: Windows x64, Node 24.19.0, Electron 44.2.0, production React bundle. No macOS/Linux host was available; the CI matrix is configured but has not been run remotely.

Passed:

- TypeScript strict type check and Vite/esbuild production compilation.
- Five core tests covering service recognition, misleading ports, TCP/UDP state filtering, IPv4/IPv6 binding scope, and protected/unverifiable process rejection.
- Real integration test: spawn an ephemeral owned TCP+UDP server, discover both sockets with its PID/start time/memory, reject a changed start time, terminate only that server, and confirm disappearance.
- Electron UI checks against real OS data: search, process inspector, PID clipboard contents, construction of a localhost URL, canceled stop preserving the fixture, confirmed stop removing it, empty state and process map.
- The same UI sequence against the packaged `release/win-unpacked/Portwhim.exe`, without a development server.
- No renderer JavaScript errors during those UI checks. Screenshot inspection found a CSS class collision; corrected and rechecked with a row-height assertion.

The desktop test intercepts `shell.openExternal` to check the generated URL without opening a browser, and substitutes native dialog responses to test cancel/confirm deterministically. It does not test browser HTTP rendering or native dialog appearance. All test termination targets are test-owned fixtures.

Screenshots in `docs/` are from the actual Windows app with real local data, including a temporary test server. The screenshot fixture is no longer running. No simulated list is presented as live data.

The local Windows bundle is unsigned. Its Electron runtime was downloaded from a mirror and matched the SHA-256 in the installed official Electron npm package. Other operating systems, signing/notarization, installer UX, force-kill, remote connections and Docker container attribution remain outside this validation.
