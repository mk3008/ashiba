# Clean-room input boundary

## Permitted Fresh Agent inputs

Each Fresh Agent received only its own clean-room directory under `C:\\tmp\\ashiba-final-clean-room-20260830`, the packed `@ashiba-ts/named-parameters` tarball, the current consumer invariant file, frozen DDL, frozen acceptance, one concise architecture prompt, and an evaluation-only harness instruction.

The tarball SHA-256 was `3B47B90F9568C55255C6B59DB6DECEA061DA0BEF56DA47DDE6F7BA655C67D0FC`.

## Excluded inputs

The worker packets expressly prohibited reading the Ashiba repository, examples, evaluation archive, historical prompts, other clean-room outputs, `@ashiba-ts/cli`, model generation, generated binding artifacts, source hashes, and freshness workflows. The application package-lock files reference the packed tarball by local `file:` path; no workspace or symlink dependency is present.

## Runner separation

The runner owned the PostgreSQL container, schema setup, behavioral oracle, static inspection, and cleanup. Its harness requirement for a `dist/index.js` `createTicketApplication(pool)` export was an oracle integration point, not an Ashiba API or application-architecture requirement.
