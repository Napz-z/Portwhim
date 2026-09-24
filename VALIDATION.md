# Continuous motion and compact workspace tools — 2026-09-24

Windows x64. The screenshot's always-visible favorite form, watch alert block, tray explanation and recent activity panel have been replaced with compact Favorites / Activity controls and an icon for hiding to the tray. Favorites and session history remain available in sliding panels. Motion 13.4.2 is pinned in the pnpm lockfile. The approved brand mark is unchanged.

Verification:

- Frontend type checking and production build passed; all 38 existing frontend tests passed. Windows debug NSIS packaging and installation succeeded. Backend behavior is unchanged in this update.
- The simulated browser fixture has an opt-in `?motionAudit=1` audit that samples computed transforms, opacity, height and blur for 50 animation frames after each click. It observed 24 distinct panel-entry states, 25 panel-exit states, 27 shared-segment states, 14 view-transition states, 19 accordion states and 25 inspector-entry states. Exiting panels were removed and focus returned to their trigger. These observations establish working intermediate frames, not a hardware frame-rate guarantee.
- Rapid Projects / Process map / List switching settled on the requested view with no leftover dialog. Inspector Shift+Tab wrapped to the final control; Escape closed it. Reduced motion produced an immediate transition and no intermediate transforms; switching back to Follow system restored full motion on this host. Favorite creation was checked through the new drawer.
- Native installed WebView scanned real local sockets. The compact toolbar, sidebar selection, favorite drawer, expanding form and Escape dismissal were visually checked. Screenshots captured intermediate entry/form frames and the fully restored main view. A sidebar label stacking issue found in preview was fixed, and the About entry now remains available in shorter windows.

The local package remains an unreleased 0.1.2 development build. macOS/Linux, high-refresh displays and sustained performance under heavy CPU load were not benchmarked. The browser audit is development-only and is not imported by the desktop bundle.

---

# Project workspace, port watches and interaction motion — 2026-09-24

Windows x64. This is a local, unreleased development build; its package version remains 0.1.2 and the public v0.1.2 installers do not include these changes. Rust 1.98.1, Visual Studio Build Tools 2022 17.14.41, MSVC 14.44.35207 and Windows SDK 10.0.26100.0 were installed with the owner's approval for this validation.

Passed:

- Frontend type checking and production build; 38 frontend tests, including Git/worktree grouping, expected-service persistence validation and restart explanations.
- 16 Rust unit tests, including normal/linked Git worktrees, localhost-only HTTP targets, real HEAD responses (503, 302 and 405), no redirect following, silent watch baselines, debounce and cooldown behavior.
- The explicitly enabled real TCP/UDP integration fixture: native discovery, process identity checks, safe termination of the owned fixture and socket disappearance.
- Windows debug executable and NSIS installer build with the locked dependency graph; local installation returned success and the installed app opened and scanned real sockets.
- Native UI showed the actual Portwhim project directory and main branch. A test-owned local HTTP server returned 503; the inspector displayed TCP connected, HTTP 503 and elapsed time. With explorer auto-refresh paused, stopping that server produced an independent port-watch alert after the debounce interval. No notification submission error was reported. The Windows desktop toast itself was not visually captured, so delivery through system notification settings is not claimed as verified.
- The visibly simulated browser fixture covered separate worktree cards, missing expected services, expected-service and favorite persistence after reload, mocked HTTP results and manager hints. Inspector entry/exit, keyboard Escape and focus restoration were checked; no browser console errors or horizontal overflow were observed at 1440 by 940. Reduced-motion handling was inspected in code; the OS motion preference was not changed.

The test server was stopped and its native watched favorite removed; explorer refresh was restored. The native app remains open. macOS/Linux execution, live Docker attribution, hide-to-tray/reopen and the range of HTTPS certificate failure modes were not exercised. Watch alerts are sampled observations, not complete process history. HTTP status codes and project association do not establish application health.

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

## 2026-09-15: Exact ports, project actions, port changes

- TypeScript check and Vite production build passed.
- Frontend: 31 tests passed, including exact search versus PID/path/partial matches, malformed and out-of-range ports, text search, owner replacement, TCP/UDP separation and duplicate-address/resource-change suppression.
- Rust: 8 tests passed, including absolute existing directory validation and rejection of missing paths/files/relative paths.
- Folder opening uses the native opener with a backend-selected, canonicalized directory; clipboard copies the backend-selected project path. Native file-manager launch and clipboard interaction have not been manually exercised in this run.
- Change summaries compare successful scans only, establish the baseline silently, retain only the latest change batch in memory, and can be dismissed. They are sampled observations, not a complete history.

## 2026-09-15: Dark change notice and Windows icon

- Replaced light notification surface with explicit dark background and text colors; body text contrast is 11.78:1.
- Tauri codegen 2.6.3 reads ICO entry zero as its window icon. Reordered existing frames from largest to smallest so the 256px frame replaces the previously selected 16px frame. All seven frames decode and their payload hashes match the original; brand geometry is unchanged.
- Production build includes the corrected style and window icon. Actual Windows taskbar rendering remains to be confirmed after reopening the updated executable.
# Feature upgrades — 2026-09-23

Windows x64. The merged tree retains the remote project-attribution actions and release workflow, plus exact URL/PID search, named favorites, persistent stop outcomes, recent port activity, Docker attribution and tray shortcuts. Before publication on 2026-09-24, restored the remote centered inspector, its project actions and directory-validation test, and retained invalid-port feedback. Production build/type checking, 33 frontend tests and 10 Rust unit tests passed on this integrated tree. Native tray and live Docker interaction remain unverified as described below.

The native debug desktop showed real local sockets. Browser fixture checks used `tests/ui-fixture.html`, visibly marked as simulated with no process termination: exact localhost-URL search, Enter-to-inspect, persistent stop feedback, favorite reload persistence and hidden-match recovery all worked. This fixture is development-only. No Docker CLI/engine was available, so live container inspection remains unverified; native tray menu interaction and background cadence also remain compile-checked rather than manually exercised.

---
