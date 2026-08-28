# Verification

Repository evidence gathered in this branch:

| Command | Result |
| --- | --- |
| `pnpm --filter @ashiba-ts/driver-adapter-core test` | 21 passed |
| `pnpm --filter @ashiba-ts/driver-adapter-pg test` | 65 passed, 3 live-dependent skipped |
| `pnpm --filter @ashiba-ts/driver-adapter-mysql2 test` | 4 passed |
| `pnpm --filter @ashiba-ts/driver-adapter-mssql test` | 4 passed |
| `pnpm --filter postgres-ticket-queue-reference test` | 1 passed, 1 live-dependent skipped |

The first focused execution in a fresh worktree failed only because workspace package `dist` outputs were absent after install; building named parameters, adapter core, and adapters restored normal resolution. This is a worktree setup condition, not a product test failure.

Standard repository verification (`pnpm verify`, `pnpm docs:build`, `git diff --check`) is run after all evaluation artifacts are finalized.
