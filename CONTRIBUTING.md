# Contributing

Use Node 24, pnpm 11 and stable Rust. Windows builds require Microsoft C++ Build Tools and WebView2. macOS requires Xcode command line tools. Linux requires WebKitGTK 4.1 and Tauri's native build dependencies.

Run pnpm install, then pnpm dev. Before submitting changes run pnpm build, pnpm test, pnpm test:live and pnpm run pack. State the operating systems actually tested.

The React interface calls a narrow typed Tauri adapter in src/native.ts. Rust owns scans, snapshot-issued selection IDs, process identity checks and native confirmation. Raw command lines must stay in Rust. Never expose arbitrary process IDs, URLs or shell commands as privileged frontend operations.

Never use existing user processes for stop tests. The ignored live integration suite creates its own TCP/UDP fixture and uses a sibling probe to verify identity and termination.

Keep source, lockfiles and approved brand assets tracked; exclude compiled targets, installers and local build tools. Preserve public/brand/mark.svg and the approved reference.
