# Portwhim

**A little clarity for your localhost.**

A small desktop home for local ports and the processes behind them. Find what owns `:3000`, inspect it, copy what you need, and get back to building.

Electron · React · TypeScript · Local only · MIT

[中文说明](README.zh-CN.md)

![Portwhim desktop running with real local data](docs/screenshot.png)

## Quick start

Install Node.js 22.12+ (Node 24 recommended) and pnpm 11.

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

Windows portable builds do not need Node.js installed. For macOS distribution, configure your own Developer ID signing and notarization. This project does not ship signing credentials or automatic updates.

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

## Naming

Checked on 2026-09-07. PortScope already has overlapping projects, including [tbxark/portscope](https://github.com/tbxark/portscope) and [TraLand PortScope](https://www.traland.com/portscope). PortLoom is used by [lkhmm520/portloom](https://github.com/lkhmm520/portloom). Exact web searches for “Portwhim” and “Portwhim github software” returned no matching project in this research pass. Portwhim is the selected working name; domain, registry and trademark availability are not guaranteed or reserved.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep the application local-first, the bridge small and each view useful. Please include OS/version and reproducible steps for scanner bugs, with secrets and personal paths removed.

MIT © Portwhim contributors.

