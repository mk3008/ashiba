# Reproduction

## Repository verification

From the repository root:

```text
pnpm typecheck
pnpm build
pnpm test
pnpm verify
pnpm docs:build
git diff --check
```

## Arm A

Use the strict VSA reference and its release-readiness provenance in
`docs/evaluations/release-readiness/VSA_TYPESCRIPT_RERUN.md`. The matched
change prompt is at `evaluation/arm-a-change-exercise/CHANGE_PROMPT.md`.
Regenerate and check the changed binding output, then run
`evaluation/verify-current-workflow-oracle.mjs` with a disposable PostgreSQL
database URL in `ASHIBA_REFERENCE_DATABASE_URL`.

## Arm B

Create a new directory containing only:

- a packed `@ashiba-ts/named-parameters` tarball;
- the inputs in `evaluation/arm-b-input/`; and
- normal npm dependencies.

Give the agent the consumer prompt and the harness separately. Do not provide
the repository, an Ashiba CLI package, existing examples, or prior candidate.
After it produces the exported application boundary from the harness, run
`evaluation/verify-primitive-only-oracle.mjs <candidate-dir>` with the same
temporary database URL.

To reproduce the drift control, copy the accepted candidate, edit only an SQL
source comment, and run its existing build without updating its static binding
module. Record whether that application-local workflow rejects the mismatch.

## Environment used

- Windows host; Node `v22.14.0`; npm `10.9.2`; pnpm `10.19.0`;
- disposable PostgreSQL 16 Docker container; and
- packed local `@ashiba-ts/named-parameters@0.1.0` (plus packed CLI for Arm A).

The container and all clean-room directories are temporary and are cleaned up
after the evaluation. No credentials or generated database data are committed.
