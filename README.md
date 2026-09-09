# Portwhim

<img src="public/brand/mark.svg" width="88" alt="Portwhim logo" />

A local port and process inspector. **Tauri 2 · Rust · React · TypeScript · MIT**

[中文说明](README.zh-CN.md)

## Features

- TCP listeners and UDP bindings, IPv4/IPv6, process identity and resource usage.
- Search by port, PID, process, service, address, project name or project directory.
- Protocol/category filters, port/memory sorting, process cards and related sockets.
- Inferred project ownership, evidence, parent process and bounded ancestry.
- Clipboard, localhost opening and native-confirmed process termination with identity checks.
- Five-second refresh, pause, manual refresh, errors and unavailable metadata.
- Local only: no account, telemetry or cloud backend. Raw command lines remain in Rust.

## Development

Install Node 24, pnpm 11 and stable Rust. On Windows also install Microsoft C++ Build Tools and WebView2. See https://v2.tauri.app/start/prerequisites/ for other platforms.

```sh
pnpm install
pnpm dev
pnpm build       # type check and build the frontend
pnpm test        # Rust unit tests
pnpm test:live   # owned TCP/UDP fixture integration test
pnpm run pack   # production executable without installer
pnpm dist       # platform installers
```

Production files are under src-tauri/target/release; installers are under its bundle directory. Windows uses the shared WebView2 runtime. If missing, the installer downloads it, requiring internet access. Node and Rust are development dependencies and are not bundled with the application.

## Interpretation and limitations

Project ownership is inferred from accessible working directories or absolute command arguments and project markers. Unknown stays unknown. Parent chains reflect current visible processes, not historical launch records. CPU sampling differs from the former provider; the first sample is unavailable. Memory is per-process RSS and must not be added repeatedly across sockets.

Stop affects the whole process and all its ports. Windows terminates immediately; Unix sends SIGTERM without force escalation. Protected processes and unverifiable identities cannot be stopped. Network bindings do not prove internet exposure. Open localhost uses HTTP and may not work for databases, HTTPS or LAN-only bindings.

Windows is the primary validation platform. macOS/Linux adapters and CI are present but require native platform validation. Historical screenshots in docs/ predate this migration. See VALIDATION.md for measured results.

## Source map

- src/: React interface and typed Tauri bridge.
- src-tauri/src/scanner.rs: socket/process collection, recognition, project attribution and identity checks.
- src-tauri/src/lib.rs: validated native commands and dialogs.
- src-tauri/tests/: real process integration test.
- public/brand/: approved brand assets.
