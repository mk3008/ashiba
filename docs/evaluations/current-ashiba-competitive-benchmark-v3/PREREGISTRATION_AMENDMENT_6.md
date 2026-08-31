# Preregistration amendment 6: resolve final scoring P0 controls

## Status at correction

The independent v2 GO audit found three deterministic implementation defects.
At correction time, primary scored-cell count remains **0**. Amendments 1–5
remain historical protocol evidence.

## Corrections

1. The supplied Ashiba tarball is now the sole allowed `file:` dependency:
   its real path, SHA-256, and package identity must match the frozen fixture.
   All other file/link/workspace dependencies and all symlinks remain static
   failures.
2. The runner rejects candidate source that references `DATABASE_URL` and
   removes that administrator variable across candidate import, API calls, and
   close. The evidence executor likewise uses a minimal child environment and
   rejects secret/DB-shaped candidate environment names. A runner-owned
   administrator-URL exfiltration negative control must be rejected.
3. The runner durably writes a pre-cleanup record, including final database
   state, before dropping the fixture. The evidence controller requires both
   runner and database-summary attachments before finalization and snapshots
   the declared built entrypoint even when it lives under an excluded build
   directory.

## Binding freeze

The first commit containing this amendment, a passing v2 packet verifier, and
the v6 reference/negative-control evidence is the sole
`executionPacketFreezeSha` for scored primary cells. It supersedes the proposed
freeze in amendment 5 before any candidate was dispatched. Any later protocol
change invalidates all affected primary cells under the correction rule.
