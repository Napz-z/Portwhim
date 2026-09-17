# Contributing to Portwhim

Thanks for helping make local development easier to understand. Small fixes, documentation improvements and reproducible bug reports are welcome. You can contribute to the interface without working on the native scanner, or improve recognition without redesigning the UI.

## Pick a starting point

| Interest | Useful contribution | Start here |
| --- | --- | --- |
| Documentation | Improve a setup step or explain a real troubleshooting case | [English README](README.md), [中文说明](README.zh-CN.md) |
| Interface | Improve keyboard access, filtering or process details | `src/main.tsx`, `src/ProcessInspector.tsx`, `src/ProcessCard.tsx` |
| Frontend logic | Fix search, grouping, browser eligibility or scan feedback | `src/explorer.ts`, `src/process-policy.ts`, `tests/` |
| Native collection | Improve service signatures, project evidence or metadata handling | `src-tauri/src/scanner.rs` |
| Native actions | Improve validated commands and browser selection | `src-tauri/src/lib.rs`, `src-tauri/src/browser.rs` |
| Platform coverage | Reproduce and document behavior on macOS or Linux | [VALIDATION.md](VALIDATION.md), `src-tauri/tests/` |

For a larger feature, open an issue describing the user problem and proposed workflow first. For a small, clear fix, a focused PR is a good starting point.

## Report a bug

Include your OS and version, app version or commit, steps to reproduce, expected behavior and actual behavior. Screenshots and error text help; remove secrets and personal paths. If recognition is wrong, describe the service and project structure without posting sensitive command arguments.

## Set up development

Use Node.js 24, pnpm 11 and stable Rust. Install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform: Microsoft C++ Build Tools and WebView2 on Windows, Xcode Command Line Tools on macOS, or the required native development libraries on Linux.

In the repository root:

```sh
pnpm install
pnpm dev
```

The command opens the desktop app. Browser-only preview cannot scan local processes. To run a production executable, use `pnpm run pack` followed by `pnpm start`.

## Validate the part you changed

- **Documentation only:** check links, command names and factual claims; no native build is required.
- **Frontend:** run `pnpm build` and `pnpm test:frontend`; check the affected interaction in the desktop app. Add tests for meaningful behavior changes.
- **Native collection, actions or packaging:** run `pnpm build`, `pnpm test`, `pnpm test:live` and `pnpm run pack`.

When a change spans these areas, combine the relevant checks. State which OS you actually tested and any checks you could not run; you do not need access to every supported platform to contribute. Service-recognition changes should cover false matches as well as expected matches.

The live integration test creates its own TCP/UDP fixture and uses a sibling probe to verify identity and termination. Never use an existing user process as a stop-test target.

## Keep these boundaries intact

The React interface calls the typed Tauri adapter in `src/native.ts`. Rust owns scans, snapshot-issued selection IDs, identity checks and native confirmation. Keep raw command lines in Rust and privileged actions tied to validated selections; do not expose arbitrary process IDs, URLs or shell commands as frontend operations.

Keep unknown data visibly unknown and distinguish inferred project/service identities from verified facts. Preserve the local-only behavior; discuss changes involving external services explicitly.

Track source, lockfiles and approved brand assets. Exclude compiled targets, installers, caches and private local settings. The editable brand master is `public/brand/mark.svg`, with the approved reference in `docs/brand/approved-reference.png`.

## Send a focused PR

Explain the user-visible problem, what changes and how you checked it. Include before/after images for visual changes when helpful, label sample data honestly and keep unrelated edits separate. For user-facing changes, update both README languages when their instructions are affected.
