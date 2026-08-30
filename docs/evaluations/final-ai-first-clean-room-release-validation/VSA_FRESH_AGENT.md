# Vertical Slice Fresh Agent result

## Result

**PASS.** A fresh Luna worker built a strict TypeScript ticket application in its isolated clean room from the packed public package and VSA prompt.

- Candidate checks: `npm run typecheck`, `npm test -- --run`, and `npm run build` passed.
- Candidate tests: 4 passed after the maintenance exercise.
- Runner PostgreSQL oracle: passed before and after maintenance.
- Direct compile/cache: all visible SQL files compile once at module initialization.
- Dynamic SQL: a closed query map selects four initial reviewed SQL files; the follow-up added `id.desc` as another visible SQL file.

## Candidate shape

The candidate used `src/index.ts`, feature-local `.sql` files, and a small candidate test file. It exported the runner harness boundary without creating an Ashiba VSA framework, repository abstraction, generated binding module, or Ashiba configuration.

## Repairs and limits

No model retry or escalation occurred. The maintenance worker reported one local patch-format correction before applying its change; it was not a product or architecture repair. The runner oracle initially normalized PostgreSQL `bigint` and mapping-name representation more generally; those were runner assumption fixes, not candidate defects.
