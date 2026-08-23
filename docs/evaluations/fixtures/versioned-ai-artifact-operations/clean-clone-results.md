# Clean-clone results

A `git clone --no-local --branch codex/versioned-ai-artifact-operations` into a
new `C:\tmp` directory was used. No old worktree was referenced.

| Command | Result |
| --- | --- |
| `node scripts/verify.mjs o1` | `VERIFY_OK` |
| `node scripts/test.mjs` | `TEST_OK` |
| `pnpm install --offline --frozen-lockfile` | passed; dependency download count was `0` |
| `pnpm build` | passed for all workspace build targets |
| `node scripts/postgres-live.mjs` (dedicated local Postgres) | 2/2 checks passed |

O2 has no versioned G3/G4 input, so `node scripts/verify.mjs o2` fails closed
with `O2_REJECTED`; a clean build would otherwise need an AI service. Thus O2
is not accepted as a reproducible build model.
