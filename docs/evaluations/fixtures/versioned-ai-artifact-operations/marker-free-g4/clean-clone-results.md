# Marker-free clean-clone results

A new `git clone --no-local --branch codex/versioned-ai-artifact-operations`
was created from committed state. No prior worktree was referenced.

| Command | Result |
| --- | --- |
| `pnpm install --offline --frozen-lockfile` | Passed with dependency download count `0` |
| `node scripts/verify.mjs` | `VERIFY_OK` |
| `node scripts/test.mjs` | `TEST_OK` |
| `pnpm build` | Passed for all workspace build targets |
| `node scripts/postgres-live.mjs` | 5/5 native PostgreSQL checks passed |

The checked-in placement artifact, ordinary application policy, verifier, and
runtime are sufficient. No AI invocation or build-time generation occurred.
