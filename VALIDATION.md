# Feature upgrades — 2026-09-23

Windows x64. Frontend production build/type checking passed. All 31 frontend tests and 9 Rust unit tests passed. Docker parser tests cover IPv4/IPv6, TCP/UDP, Compose labels, exposed-only exclusion, invalid JSON and published port ranges. The real owned TCP/UDP integration test passed outside the sandbox: scan, identity validation, termination and disappearance; no unrelated process was stopped.

The native debug desktop launched and showed real local sockets. Browser interaction checks used `tests/ui-fixture.html`, visibly marked as simulated with no process termination: exact localhost-URL search excluded a conflicting PID; Enter opened details; simulated stop produced persistent feedback and activity; a favorite with no listener survived reload; protocol-hidden matches recovered with Show all matches. The fixture is a development-only entry, not the production entry. Computer-use checks informed the fixture base-URL correction and refresh-label correction.

Limits: this machine has no Docker CLI/engine, so live container integration is not verified. Native tray menu selection/hide/restore and background timer cadence are implemented and compile-checked but not interaction-verified. Native UI input automation was unreliable; browser fixture checks do not substitute for native stop-dialog or tray verification. No new installer was built or installed. macOS/Linux remain unverified.

An ensuing Rust rebuild exposed a Vite watcher EBUSY error on a generated Windows executable. Vite now excludes `src-tauri` (Tauri owns its Rust watcher). This stopped the final browser cleanup/recheck; earlier interaction results above were completed before the server exited.

---

# Stop feedback and first-scan states — 2026-09-14

Windows x64. TypeScript checking and the Vite production build passed. Twenty-nine frontend tests passed, including target-process identity, recycled-PID separation, port release, replacement ownership and still-listening stop outcomes. Seven Rust unit tests passed. The owned TCP/UDP fixture integration test passed outside the restricted sandbox: native discovery, identity checks, termination and socket disappearance all completed without touching an unrelated process.

The disconnected desktop-bridge state was visually checked in the local frontend at a narrow viewport and remained readable without the former duplicate notice. The actual first-scan backend-error branch and post-stop toast timing were not automated visually; their state selection and message outcomes are covered by production type checking and frontend tests. Native stop confirmation appearance remains outside automated UI coverage.

---

# Tauri migration verification — 2026-09-09

Windows x64, Rust 1.98.1, Tauri 2.11.5, shared WebView2 152. Electron runtime, dependencies, entry points and JavaScript native providers have been removed from the active build. Approved brand assets are unchanged.

Passed:
- TypeScript check and Vite production build.
- Three Rust unit tests: service signatures and port hints; binding scope; project marker lookup including dependency exclusion and relative-path rejection.
- Real owned TCP/UDP fixture: native discovery, project name, parent information, stale start-time rejection, protected selection rejection, private identity field exclusion, termination and socket disappearance. A sibling probe stops only the fixture created by the test.
- Actual release Tauri WebView: 161 real socket rows, search empty state, inspector, process map, loaded approved SVG; no observed page errors during interactions.
- Native clipboard contents verified against selected port; invalid snapshot selection rejected.
- Optimized Windows executable and NSIS installer generated successfully.

Sizes: executable 4,639,744 bytes (4.42 MiB); installer 1,597,439 bytes (1.52 MiB). These exclude the shared WebView2 runtime and developer files. The previous Electron unpacked directory was 421,052,011 bytes (401.55 MiB); it is not a like-for-like download comparison. No runtime RAM benchmark was performed.

Limitations: macOS/Linux are not locally validated. Native stop dialog appearance/cancel interaction and external browser HTTP rendering were not automated; actual termination logic was tested on owned processes. The installer was built but not installed during this check. Windows signing is not configured. Installer downloads WebView2 if absent; offline machines need it preinstalled. CPU is sampled by sysinfo and the initial sample is unavailable. Historical screenshots below predate Tauri.

---

# MVP verification — 2026-09-07

## Project attribution update — 2026-09-08

Windows: strict TypeScript check and production build passed. Eight tests passed, including real TCP/UDP fixture project name/directory and immediate parent PID attribution, fixture termination, quoted paths with spaces, node_modules exclusion, missing evidence, command-line privacy, cyclic ancestry and recycled parent rejection. Linux cwd support and macOS paths are implemented but not validated on those operating systems. The new detail panel has not undergone automated visual interaction testing.

Brand update: the owner-approved straight-corner logo is now used by the sidebar, window and packaged Windows executable. Strict type checking and production build passed. The new packaged application launched successfully, loaded the SVG, scanned real ports, and rendered list/map views without renderer errors. Windows executable icon resources were replaced with the exported seven-resolution ICO and checked for presence. Current screenshots were refreshed from this branded build without a temporary server.

Environment: Windows x64, Node 24.19.0, Electron 44.2.0, production React bundle. No macOS/Linux host was available; the CI matrix is configured but has not been run remotely.

Passed:

- TypeScript strict type check and Vite/esbuild production compilation.
- Five core tests covering service recognition, misleading ports, TCP/UDP state filtering, IPv4/IPv6 binding scope, and protected/unverifiable process rejection.
- Real integration test: spawn an ephemeral owned TCP+UDP server, discover both sockets with its PID/start time/memory, reject a changed start time, terminate only that server, and confirm disappearance.
- Electron UI checks against real OS data: search, process inspector, PID clipboard contents, construction of a localhost URL, canceled stop preserving the fixture, confirmed stop removing it, empty state and process map.
- The same UI sequence against the packaged `release/win-unpacked/Portwhim.exe`, without a development server.
- No renderer JavaScript errors during those UI checks. Screenshot inspection found a CSS class collision; corrected and rechecked with a row-height assertion.

The desktop test intercepts `shell.openExternal` to check the generated URL without opening a browser, and substitutes native dialog responses to test cancel/confirm deterministically. It does not test browser HTTP rendering or native dialog appearance. All test termination targets are test-owned fixtures.

Screenshots in `docs/` are from the actual Windows app with real local data. Earlier MVP screenshots included a temporary test server; the latest brand-update screenshots do not. No simulated list is presented as live data.

The local Windows bundle is unsigned. Its Electron runtime was downloaded from a mirror and matched the SHA-256 in the installed official Electron npm package. Other operating systems, signing/notarization, installer UX, force-kill, remote connections and Docker container attribution remain outside this validation.

## Restricted process metadata fix — 2026-09-09

A read-only Windows scan reproduced missing start times and zero-valued memory from sysinfo for System, service hosts and several background services. Partial restrictions now appear as a per-process stopReason instead of a blanket warning. Whole-scan identity failure still produces a warning. Zero RSS is conservatively treated as unavailable because this provider uses zero for failed reads; CPU is unavailable when identity metadata is absent. Missing values are excluded from measured-process counts. Five unit tests and the owned TCP/UDP integration test passed, along with frontend type checking. Stop identity checks remain enforced. This does not grant access to OS-restricted processes.
Release UI verification: no global warning for the mixed-access scan; 123 restricted socket rows had null memory and all disabled stop actions had a reason. The port 135 inspector displayed the specific startup-time limitation. NSIS installer rebuilt successfully.
