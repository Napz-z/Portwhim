# Portwhim

<img src="public/brand/mark.svg" width="88" alt="Portwhim logo" />

**A little clarity for your localhost.**

A small desktop home for local ports and the processes behind them. Find what owns `:3000`, inspect it, copy what you need, and get back to building.

Electron · React · TypeScript · Local only · MIT

[中文说明](README.zh-CN.md)

![Portwhim desktop running with real local data](docs/screenshot.png)

## Why Portwhim?

An `EADDRINUSE` error should not turn into a hunt across terminals and process managers. Portwhim brings the port, its owner, its resource usage and the next action into one desktop workflow.

- **Find the owner:** search by port, PID, process, service or bind address.
- **Understand the impact:** inspect the process and its other sockets before stopping it.
- **Recognize familiar services:** identify common framework and database signatures, with explicit labels for unverified port hints.
- **Stay in one place:** copy a PID, open localhost or confirm a process stop from the inspector.
- **Keep it local:** no account, cloud backend or telemetry.

Built for developers running several frontend, backend, database and script services at once. The current release is **0.1.0**, with an English interface. Windows has local validation records; macOS and Linux still need platform validation.

### How it compares

This compares common workflows, not benchmarks or every feature of individual products.

| Approach | Useful for | Where Portwhim helps |
| --- | --- | --- |
| `netstat`, `ss`, `lsof` | Terminal diagnostics, scripting and automation | Combines ownership, inspection, filtering and actions in a desktop interface |
| Task managers and activity monitors | System-wide processes and resource usage | Starts with a port and leads to its owner and sibling sockets |
| Port-killing utilities | Ending an already identified port owner quickly | Shows identity, resource usage and affected sockets before confirmation |
| Network scanners and packet analyzers | Host discovery, connections and packet inspection | Focuses on local listeners and bindings for everyday development |

Portwhim's advantage is a focused, visual workflow. It includes the Electron runtime, so its package is larger than a small native CLI tool. It does not currently provide a command-line automation interface.

## Quick start

Install Node.js 24 and pnpm 11, matching the contribution guide and CI configuration.

```sh
pnpm install
pnpm dev
```

The command launches the desktop app and the local renderer development server. Open the **desktop window**, not the Vite URL: the browser does not have access to native process APIs. The first scan may take a few seconds.

Production build:

```sh
pnpm build
pnpm start
```

Package on the target operating system:

```sh
pnpm run pack # unpacked application in release/
pnpm dist     # Windows portable exe / macOS dmg / Linux AppImage
```

Use `pnpm run pack`, not `pnpm pack` (the latter creates a source tarball). Run `pnpm build` before the first `pnpm start` and after source changes. Windows portable builds do not need Node.js installed. For macOS distribution, configure your own Developer ID signing and notarization. This project does not ship signing credentials or automatic updates.

## What works

- Local TCP listeners and bound UDP sockets, including IPv4 and IPv6.
- PID, process name, port, protocol, bind address, process start time, CPU and resident memory when available.
- Next.js, Vite, Laravel, Node.js, Docker, PostgreSQL, Redis, MySQL and Python signatures. A database inferred only from its usual port is explicitly marked **port hint**.
- Search by port, PID, process, service or address. Filter dev services, network-bound sockets and TCP/UDP. Sort by port or memory.
- Process map: one process with its bound sockets. This is a local ownership map, not a remote connection graph.
- Five-second refresh with pause/resume, manual refresh, empty states, error messages, and retained last successful data when a scan fails.
- Process inspector with start time, CPU, memory, recognition confidence and sibling sockets.
- Copy PID or port; open an HTTP localhost URL for a TCP socket.
- Stop a process with native confirmation and a fresh PID/name/start-time check. Protected or unverifiable processes cannot be stopped.
- No account, cloud backend, remote port probes or analytics. Raw command lines are used for recognition in the main process and are not sent to the UI.

## Usage guide

### Resolve a port conflict

1. Open the desktop app and wait for the first scan.
2. Press `Ctrl+K` / `⌘K` and enter `3000`. Search matches text, so verify that the **PORT** column is the port you want.
3. Click the row or its arrow to open **PROCESS INSPECTOR**.
4. Check the process name, PID, start time and **Other sockets in this process**.
5. For a web service you want to keep, choose **Open localhost**. For a process you no longer need, choose **Stop process** and confirm in the native dialog.
6. Check the refreshed results, then restart your development server.

Stopping affects the **whole process**, including its other ports, and may lose unsaved work. Read the platform notes below for termination behavior.

### Explore running services

| Control | What it does |
| --- | --- |
| **All listeners** | Shows TCP listeners and UDP bindings |
| **Dev services** | Shows recognized apps, databases and container-related entries; this is rule-based classification, not a project inventory |
| **Network bound** | Shows non-loopback bindings, including all-interface bindings |
| Search | Matches port, PID, process, service and address, case-insensitively |
| **All protocols / TCP / UDP** | Filters by protocol |
| **Port / Memory** | Toggles ascending port order and descending process memory order |
| List / **Process map** | Switches between individual sockets and cards grouped by PID |

Search, category and protocol filters work together and also apply to the process map.

![Process map showing processes and their bound sockets](docs/process-map.png)

Click a port or PID to copy it. The inspector includes bind address, scope, start time, CPU, resident memory and recognition evidence. **Open localhost** opens an HTTP URL for TCP entries; UDP entries cannot use this action.

Automatic refresh requests a scan every five seconds without overlapping an active scan. Pause it to inspect the current snapshot, resume with the play button, or use **Refresh** manually even while paused. Failed scans retain the last successful data and display an error.

### Read the numbers correctly

- **Listening sockets** counts TCP listener and UDP binding entries, not processes or unique port numbers.
- The **Dev services** summary card counts distinct PIDs; the sidebar count is the number of matching entries.
- **Memory footprint** sums available RSS measurements once per PID in the full snapshot. It is not total system memory usage.
- Per-row memory and CPU belong to the process and are shared by all its sockets; do not add duplicate rows together.
- **port hint** means a usual port suggests a service, not that the service identity is verified.
- **Process / command signature** is a heuristic match against process or command information.
- **— / Unavailable** means metadata was not provided, not that the value is zero.

## Frequently asked questions

### Why is the list empty or the desktop connection unavailable?

Use the Electron window launched by `pnpm dev`, or run `pnpm build` followed by `pnpm start`. An ordinary browser tab cannot access the native bridge. Clear search, select **All listeners** and **All protocols**, then refresh. If the list remains empty, check scan warnings and OS access restrictions.

### Why is Stop process disabled or rejected?

Protected processes and processes without verifiable identity cannot be stopped. Limited OS permissions can also hide metadata. Portwhim does not elevate automatically. If a selection expires or the process changes, refresh and select it again.

### Why does Open localhost fail?

A bound port does not necessarily serve HTTP. HTTPS, databases and services bound only to a specific network address may require their actual URL or a dedicated client.

### Why did the process come back after stopping it?

A supervisor, development tool or service manager may restart it. On Unix, a process may also ignore or delay handling SIGTERM. Check the tool that launched it; Portwhim does not disable restart policies or escalate to force-kill.

### Can I manage Docker containers or remote hosts?

Current Docker recognition only identifies host-process signatures. Container inventories, published-port attribution, container stop actions and SSH hosts are not implemented. The process map shows local socket ownership, not remote connections or traffic.

### Where can I download a Windows build?

This repository does not currently configure a public download link. If you receive a portable Windows executable from the maintainer, run it directly without Node.js. For an unpacked ZIP, extract the entire folder and run `Portwhim.exe`; keep its runtime files and `resources` directory together. The locally validated Windows build is unsigned and has no automatic updater.

## Platform notes

| Platform | Implementation | Validation in this workspace |
| --- | --- | --- |
| Windows | Native socket/process metadata through systeminformation | Live scan, process metadata and owned-fixture termination tested |
| macOS | systeminformation / OS tools | Supported by adapter; requires testing on a Mac |
| Linux | systeminformation / OS tools | Supported by adapter; requires testing on Linux |

An unprivileged account may not see other users' process metadata. Unknown values appear as `—`; the app does not silently request administrator privileges. Unix systems need standard process/socket tools used by systeminformation (for example `ps`, `ss`/`netstat`, and `lsof` depending on OS). Do not treat an empty scan as proof that the machine has no services if OS permissions or tooling are restricted.

UDP does not have TCP's LISTEN state; UDP rows represent local bindings. Memory and CPU are **per process**, not per socket; the summary deduplicates PIDs. CPU sampling semantics follow the OS provider and may not match Task Manager's interval. The first sample can be less useful than subsequent ones.

“Network bound” means a non-loopback binding; it is not a firewall or Internet-exposure test. Opening localhost does not promise the service speaks HTTP. HTTPS, database sockets and services bound only to a LAN address may not load in a browser. Docker recognition identifies a host process; container inventories, published-port attribution and container stop operations are future work.

Stop affects the selected **whole process**, not just one socket or a process tree. On Unix it sends SIGTERM; on Windows Node terminates the process immediately. The UI confirms this before acting. A supervisor may restart a process, and a Unix process may ignore SIGTERM. The app does not escalate to force-kill. Revalidation narrows PID reuse risk but is not an atomic kernel handle guarantee.

## Keyboard and controls

- `Ctrl+K` / `⌘K`: focus search.
- `Esc`: close the inspector or About dialog.
- Click a service or the row arrow to inspect it.
- Click a port or PID to copy it.
- Use the list/map toggle to switch to process ownership cards.

## Architecture

```text
src/main.tsx            React desktop UI
src/style.css           Dark mint visual system
src/shared.ts           Typed native bridge contract
electron/preload.ts     Minimal context-isolated IPC API
electron/main.ts        Window, trusted IPC, clipboard, URLs, confirmation
electron/scanner.ts     OS adapter, normalization, identity checks, stop
electron/detect.ts      Pure, ordered service recognizers
tests/                 Classification and real owned-process integration
scripts/               Dev and production build orchestration
```

The renderer cannot run shell commands or choose an arbitrary process ID to stop. It sends only a snapshot-issued selection ID. The main process resolves the selection, verifies the calling frame, constructs localhost URLs itself, and validates clipboard fields. Browser navigation, new windows and permission requests are denied. The production renderer is loaded from local bundled files with a content security policy; no local HTTP control API is exposed.

## Extending it

Keep native providers in `electron/`, expose typed data in `src/shared.ts`, and add narrowly scoped bridge methods. The current adapter boundary is the `scan(): Promise<Snapshot>` function.

Planned, not included in 0.1:

1. Connection graph: a separate connection model for remote endpoints, with PID edges and IPv6 normalization.
2. Docker provider: optional daemon connection, published ports and container-aware actions with separate confirmation.
3. WebSocket updates: push snapshot diffs to the renderer instead of polling; no unauthenticated remote control endpoint.
4. Remote connections: explicit host profiles, SSH transport, authenticated read-only collection first.
5. Process/project grouping, custom recognition rules, preferences and tray mode.

Do not mix an inferred service label with verified framework identity. Add fixture tests for each new recognizer, especially false positives.

## Tests

```sh
pnpm test
pnpm test:live
pnpm build
```

The live integration test creates its own ephemeral TCP and UDP server, checks process metadata, rejects a stale identity, stops **only that fixture**, and verifies its listener disappears. No existing user processes are stopped by tests. Run it with normal OS access; heavily sandboxed shells can suppress process metadata.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep the application local-first, the bridge small and each view useful. Please include OS/version and reproducible steps for scanner bugs, with secrets and personal paths removed.

MIT © Portwhim contributors.
