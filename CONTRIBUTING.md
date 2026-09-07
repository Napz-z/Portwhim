# Contributing

Use Node 24 and pnpm 11. Run `pnpm install`, then `pnpm dev`. Before a pull request run `pnpm test`, `pnpm test:live`, and `pnpm build` on the operating systems you can access. State which platforms were actually tested.

Keep service detection pure and test misleading names/ports. Preserve null metadata instead of inventing values. Keep raw command lines in the native layer. New native operations require explicit typed inputs, sender checks, and main-process validation.

Do not add telemetry or remote connections implicitly. Discuss new native providers and external dependencies in an issue first. Small focused pull requests are easiest to review.

Never use arbitrary existing processes to test stop actions. Spawn a fixture, retain its PID/start identity, and clean it up. UI and integration fixtures must not impersonate live production data.
