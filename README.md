![Portwhim logo](docs/brand/readme-mark.svg)

# Portwhim

**Find the port. Find the project. Get back to building.**

A desktop workspace for the services running on your machine.

[简体中文](README.zh-CN.md) · [Get started](#get-started) · [Usage](#everyday-workflows) · [Contribute](#contribute)

**[Download for Windows x64 — v0.1.2](https://github.com/Napz-z/Portwhim/releases/download/v0.1.2/Portwhim_0.1.2_x64-setup.exe)** · [macOS / Linux downloads](#download-a-built-app) · [Latest release](https://github.com/Napz-z/Portwhim/releases/latest)

Preview build. Windows installers are unsigned; macOS builds are not notarized. See [platform status and installation notes](#download-a-built-app) before installing.

Your dev server says `EADDRINUSE`. Several processes are called `node`. One belongs to today's project; another might be yesterday's forgotten server. Which one should you stop?

**Portwhim connects local ports to their processes and, when identifiable, their projects.** Inspect the owner, open its project folder, see its other ports, and confirm a stop without piecing together several terminal commands.

Built with **Tauri 2 · Rust · React · TypeScript**. Local only, no account or telemetry. [MIT licensed](LICENSE).

## A look inside

**Port explorer** — inspect ports, bind addresses, protocols and owning processes in one list. Shown here with the **System managed** filter selected.

![Portwhim port explorer showing summary cards, search, filters and system-managed port bindings](docs/screenshots/port-explorer.png)

**Process map** — see ports grouped by their owning process, with TCP/UDP protocols and binding counts. Expand a card to reveal more ports.

![Portwhim process map showing process cards with their ports, protocols and binding counts](docs/screenshots/process-map.png)

## When is it useful?

| When this happens… | Use Portwhim to… |
| --- | --- |
| “Port 3000 is already in use.” | Find the exact port, inspect its owner, stop the unwanted process and check the result. |
| You have several repos and dev servers open. | Search by project name or directory and jump to the identified project folder. |
| You cannot tell which `node` or `python` process is yours. | Check service recognition, project evidence, start time and the visible parent chain. |
| You suspect an old development server is still running. | Filter **Dev services**, sort by memory and inspect the process before deciding what to close. |
| A service keeps reappearing after you stop it. | Look for a changed owner in the scan summary and inspect its visible launch ancestry. |
| You want to check a server's bind address. | See loopback, all-interface and network bindings together, with IPv4 and IPv6 details. |

## Why Portwhim?

### Context beyond a PID

A process name alone often does not tell you which repo to return to. Portwhim looks for project markers in accessible local paths and shows the inferred project, directory and supporting evidence. **Open folder** and **Copy path** take that context into your next step.

### Inspect, act, check the result

Before stopping, see the process's other sockets and resource details. Portwhim checks process identity and asks for native confirmation, then rescans to report whether the target is still observed, the port has disappeared from the scan, or another process now owns it.

### A view you can keep open while developing

Exact port search, project search, combined filters, process cards and five-second refresh make it useful across several services. A dismissible summary highlights the latest observed port arrivals, disappearances and owner changes.

Search also accepts `:3000`, `port:3000`, local URLs such as `http://localhost:3000`, and `pid:1234`. Press Enter to inspect the first result; if a protocol or ownership filter hides a match, the search summary can restore all matches. Named TCP/UDP favorites are stored locally (up to 32), including ports with no current listener.

The app keeps the latest 20 port changes and post-stop outcome in the current session. It refreshes every five seconds in the foreground and every thirty seconds in the background. An explicit **Hide to tray** action keeps the app available; the tray shows favorite-port status and quick navigation, while closing the window quits.

**Docker published ports** is a manual, read-only inspection of the local Docker engine. It shows container names, host/container mappings and Compose projects, but never stops containers. Docker CLI and a running local engine are required; remote contexts, custom/rootless sockets and network reachability are outside its scope.

### Local data, a shared system webview

Scans and project recognition run locally in Rust. Raw command lines stay out of the interface. The desktop app uses Tauri and the system webview; running a built app does not require Node.js or a Rust toolchain.

### How it fits alongside your existing tools

| Tool or workflow | Where it fits | What Portwhim brings |
| --- | --- | --- |
| `netstat`, `ss`, `lsof` | Terminal diagnostics and scripts | A browsable port → process → project workflow |
| Task managers | Whole-machine process and resource inspection | A starting point at the port that is blocking your work |
| Port-killing commands | Quickly stopping a known target | Context before stopping and scan feedback afterwards |

These are workflow comparisons, not claims that Portwhim is faster or more capable in every situation. Its focus is interactive local development; it does not provide a scripting CLI, packet capture or remote-host management.

## In development (not included in the v0.1.2 installers)

- **Project view:** use the folder button beside List / Process map. Services share a card by Git working directory, with branch and worktree context when readable; otherwise the detected project directory is used. Add up to 64 named expected TCP/UDP services locally. An occupied port attributed elsewhere is distinguished from a missing listener. Unknown owners remain separate.
- **Port watch:** enable **Watch** on individual favorites. A native worker scans every 5 seconds while the app runs, including in the tray and when explorer refresh is paused. Its first successful observation is silent; changes must persist for at least 10 seconds, with a 60-second cooldown per port. Same-project/name PID changes are suppressed to reduce hot-reload noise; without project attribution, process identity is used. Failed scans do not count as disappearance. The last 20 watch alerts stay in the current session. System notification settings still apply; Windows notification delivery needs an installed app.
- **Restart diagnosis:** the inspector combines the observed parent chain, recognized manager signatures and the most recent stop target. It suggests where to investigate nodemon, Node watch mode, PM2, service managers or Docker. These are clues, not proof of restart causality. No automatic repeated termination is performed.
- **Connection check:** manually select HTTP or HTTPS in the inspector. Portwhim tests local TCP connectivity, then sends a HEAD request to `/` and shows status, elapsed time and check time. Only loopback-reachable TCP bindings are allowed. Redirects and proxies are disabled; certificates are validated; response bodies are not read. HEAD rejection, authentication errors and HTTP 5xx are shown as responses, not labeled healthy. TCP connect and HTTP timeouts are 2 and 4 seconds.
- **Interaction:** short view transitions, dialog entrance/exit, expandable project cards, hover/press feedback and result transitions. The inspector traps keyboard focus and restores it on close. System reduced-motion settings disable animation.

These changes require a new source build. See [validation records](VALIDATION.md) for the checks actually completed.

## Get started

### Download a built app

Download an installer for **v0.1.2**, install it and launch **Portwhim**. You do not need Node.js, pnpm or Rust to use a built app.

| Platform | Download v0.1.2 | Validation status |
| --- | --- | --- |
| Windows x64 | [EXE installer](https://github.com/Napz-z/Portwhim/releases/download/v0.1.2/Portwhim_0.1.2_x64-setup.exe) · [MSI installer](https://github.com/Napz-z/Portwhim/releases/download/v0.1.2/Portwhim_0.1.2_x64_en-US.msi) | Primary validated platform; installer installation still needs validation |
| macOS Apple Silicon | [DMG](https://github.com/Napz-z/Portwhim/releases/download/v0.1.2/Portwhim_0.1.2_aarch64.dmg) | Built in CI; native installation and runtime validation still needed |
| macOS Intel | [DMG](https://github.com/Napz-z/Portwhim/releases/download/v0.1.2/Portwhim_0.1.2_x64.dmg) | Built in CI; native installation and runtime validation still needed |
| Linux x64 | [DEB](https://github.com/Napz-z/Portwhim/releases/download/v0.1.2/Portwhim_0.1.2_amd64.deb) · [AppImage](https://github.com/Napz-z/Portwhim/releases/download/v0.1.2/Portwhim_0.1.2_amd64.AppImage) | Built in CI; native installation and runtime validation still needed |

See the [v0.1.2 release notes](https://github.com/Napz-z/Portwhim/releases/tag/v0.1.2) for this preview build, or check the [latest release](https://github.com/Napz-z/Portwhim/releases/latest) for newer versions.

- Windows installers are **unsigned**. macOS builds use **ad-hoc signing without notarization**. Your OS may display a trust warning or block installation.
- Windows requires WebView2; the installer downloads it if missing, so offline machines need it installed beforehand.
- A successful CI build does not establish that installation and all features work on every platform. See [validation records](VALIDATION.md) for the actual tested scope.

### Run from source

Install **Node.js 24**, **pnpm 11**, **stable Rust**, and the [Tauri prerequisites for your OS](https://v2.tauri.app/start/prerequisites/). Windows builds need Microsoft C++ Build Tools and WebView2; macOS needs Xcode Command Line Tools; Linux needs its native development dependencies.

Download or clone this repository, open a terminal in its root directory, then run:

```sh
pnpm install
pnpm dev
```

Use the desktop window that opens. An ordinary browser tab cannot access the native scanner. The first build can take longer while Rust dependencies compile.

To build a standalone desktop executable and run it:

```sh
pnpm run pack
pnpm start
```

## Everyday workflows

### Free up port 3000

1. Open **All listeners** and press `Ctrl+K` / `⌘K`.
2. Enter `3000`, `:3000` or `port:3000` to match that port exactly.
3. Click a result to inspect its process, project, start time and other sockets.
4. If you recognize it as a process you no longer need, choose **Stop process** and confirm.
5. Read the follow-up scan result before restarting your server.

Stopping ends the **whole process**, affecting all its ports and potentially unsaved work. Windows terminates immediately; Unix sends `SIGTERM` without force escalation. System-managed, protected and unverifiable processes cannot be stopped. If a supervisor restarts it, stop it through the tool that manages it.

### Find the project behind a service

Search for a project name, directory, service or process name. Open **Project & launch origin** in the inspector to see the inferred directory, evidence and parent chain. Choose **Open folder** to return to the project or **Copy path** to share the location.

Project attribution is inferred from available paths and markers such as `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `composer.json` or `.git`. Missing evidence remains **Unknown**. The parent chain describes currently visible processes, not a complete launch history.

### Review services at a glance

| Control | Use it for |
| --- | --- |
| **Dev services** | Recognized development services, excluding system-managed processes |
| **System managed** | Processes classified as managed by the operating system |
| **Network bound** | Non-loopback bindings; this does not prove public internet access |
| **TCP / UDP** | Protocol filtering, combined with search and the selected category |
| **Port / Memory** | Ascending port or descending process RSS order |
| **Process map** | Cards grouping a process's ports and address bindings |
| **Refresh / Pause** | Manual scans or control of the five-second refresh cycle |

Click a port or PID to copy it; press `Esc` to close details. Text searches are fuzzy, but numeric and `port:` queries are exact port queries, not PID queries. Active filters still apply.

**Open localhost** is available for eligible TCP bindings with a recognized web-service signature or supported web port. It selects HTTP/HTTPS and a loopback address; database, UDP, LAN-only and unknown-protocol entries are disabled with a reason. Eligibility is a hint, not a successful connection test.

### Understanding the readings and scan feedback

- **Listening sockets** counts TCP listeners and UDP bindings, not unique port numbers. UDP has no TCP-style listening state.
- **Dev services** in the summary counts distinct PIDs; sidebar counts are socket entries.
- **Memory footprint** sums known RSS values once per PID across the full snapshot. It is not whole-machine memory usage. Multiple rows for a process share resource figures.
- CPU is sampled; the first sample is unavailable. Its interval may differ from Task Manager. Missing metadata appears as `—`.
- Service recognition covers common Next.js, Vite, Laravel, Node.js, Python, PostgreSQL, Redis, MySQL and Docker signatures. A **port hint** is an unverified suggestion. The separate Docker inspection shows published mappings from a manual local-engine snapshot.
- Recent activity compares successful scans and retains up to 20 changes in the current session. It can be dismissed, is not saved across restarts, and may miss changes between scans.
- A clear scan or a post-stop “free” result describes observed bindings at that moment, not a guarantee that a later bind will succeed.

### Troubleshooting

- **No results?** Clear search and reset filters, then refresh. Check for scan errors or permissions restrictions before concluding nothing is running.
- **Desktop connection unavailable?** Open the desktop application with `pnpm dev` or build it with `pnpm run pack` and use `pnpm start`. `pnpm build` alone only builds the frontend.
- **Stop disabled?** Read the reason in the inspector. Missing identity data, protected processes and system-managed processes disable this action. A stale selection requires a refresh.
- **Scan failed?** Retry. An initial failure has its own error state; after a successful scan, failures retain the previous snapshot with an error notice.
- **Project unknown?** Available process paths may not contain an accessible project marker. Identification is best-effort, not an inventory of every repo.

## Contribute

You do not need to know the whole codebase to help. Documentation fixes, reproducible bug reports and small PRs are welcome.

Useful starting points:

- **Docs and onboarding:** clarify a confusing step or add a real troubleshooting example.
- **React / TypeScript:** improve keyboard navigation, filtering and process inspection.
- **Rust:** improve service recognition or project attribution, including tests for false matches.
- **Platform testing:** try the app on macOS or Linux and report the OS version, steps and actual results.

For a bug, describe what you expected, what happened and how to reproduce it. For a larger feature, open an issue to discuss the workflow before investing in implementation. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, focused validation and a source map.

## Development commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Launch the Tauri development window |
| `pnpm build` | Type-check and build the frontend |
| `pnpm test:frontend` | Run frontend logic tests |
| `pnpm test` | Run frontend and Rust tests; the live fixture is separate |
| `pnpm test:live` | Run the owned TCP/UDP fixture integration test |
| `pnpm run pack` | Build a production desktop executable without an installer |
| `pnpm start` | Launch the executable built by `pnpm run pack` |
| `pnpm dist` | Build platform installers |

Executables are under `src-tauri/target/release`; installers are under its `bundle` directory. Use `pnpm run pack`, not the package manager's `pnpm pack` tarball command.

The [validation log](VALIDATION.md) records what was actually checked. The previews above are provided screenshots of the Windows app. Older images at `docs/screenshot.png` and `docs/process-map.png` predate the Tauri migration and remain historical references.

## License

[MIT](LICENSE) © Portwhim contributors.
