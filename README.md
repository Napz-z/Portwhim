# Portwhim

<img src="public/brand/mark.svg" width="88" alt="Portwhim logo" />

A local port and process inspector. **Tauri 2 · Rust · React · TypeScript · MIT**

[中文说明](README.zh-CN.md)

## Features

- TCP listeners and UDP bindings, IPv4/IPv6, process identity and resource usage.
- Exact port search (`3000`, `:3000`, `http://localhost:3000`), explicit `pid:1234`, and text search across process, service, address and project. Enter inspects the first result; hidden matches offer filter recovery.
- Named TCP/UDP favorites stored locally (up to 32), including ports with no observed listener.
- Protocol/category filters, port/memory sorting, process cards and related sockets.
- Inferred project ownership, evidence, parent process and bounded ancestry.
- Clipboard, localhost opening and native-confirmed process termination with identity checks.
- Persistent-in-session stop outcomes and the latest 20 observed port changes, including occupant changes that may indicate a restart.
- Five-second foreground / thirty-second background refresh, pause, manual refresh, truthful first-scan failures and unavailable metadata.
- Tray favorites with snapshot status and quick navigation. Use Hide to tray explicitly; closing the window still quits.
- Optional manual, read-only local Docker published-port inspection with container names and Compose projects. No container stop controls.
- Local only: no account, telemetry or cloud backend. Raw command lines remain in Rust.

## Development

Install Node 24, pnpm 11 and stable Rust. On Windows also install Microsoft C++ Build Tools and WebView2. See https://v2.tauri.app/start/prerequisites/ for other platforms.

```sh
pnpm install
pnpm dev
pnpm build       # type check and build the frontend
pnpm test        # Rust unit tests
pnpm test:frontend # search, activity, safety and display policy tests
pnpm test:live   # owned TCP/UDP fixture integration test
pnpm run pack   # production executable without installer
pnpm dist       # platform installers
```

Production files are under src-tauri/target/release; installers are under its bundle directory. Windows uses the shared WebView2 runtime. If missing, the installer downloads it, requiring internet access. Node and Rust are development dependencies and are not bundled with the application.

## Interpretation and limitations

Project ownership is inferred from accessible working directories or absolute command arguments and project markers. Unknown stays unknown. Parent chains reflect current visible processes, not historical launch records. CPU sampling differs from the former provider; the first sample is unavailable. Memory is per-process RSS and must not be added repeatedly across sockets.

Stop affects the whole process and all its ports. Windows terminates immediately; Unix sends SIGTERM without force escalation. Protected processes and unverifiable identities cannot be stopped. Network bindings do not prove internet exposure. Open localhost uses HTTP and may not work for databases, HTTPS or LAN-only bindings.

No observed listener is not a guarantee that an application can bind the port. Activity is an in-memory comparison of successful snapshots, not an audit log; changes between scans can be missed. Stop outcomes remain until dismissed or the app closes. Favorites are stored in this installation's WebView local storage.

Docker inspection requires the Docker CLI and a running local engine. It deliberately ignores remote contexts and Docker host environment overrides, uses the default Windows pipe or Unix socket (including the macOS Desktop socket), and has time/output limits. Custom/rootless sockets are not supported. Docker mappings are a separate snapshot, not proof of OS process ownership or reachability. Tray timestamps indicate the latest successful scan; paused or failed scans can leave stale data. OS background throttling may delay refreshes.

Windows is the primary validation platform. macOS/Linux adapters and CI are present but require native platform validation. Historical screenshots in docs/ predate this migration. See VALIDATION.md for measured results.

## Source map

- src/: React interface and typed Tauri bridge.
- src-tauri/src/scanner.rs: socket/process collection, recognition, project attribution and identity checks.
- src-tauri/src/lib.rs: validated native commands and dialogs.
- src-tauri/tests/: real process integration test.
- public/brand/: approved brand assets.
