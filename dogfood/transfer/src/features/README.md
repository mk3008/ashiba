# SQL-First Feature Layout

This package organizes application work under `src/features/<feature>/`.

The review center is the SQL contract:

- `queries/<query>/<query>.sql` is the canonical source.
- `queries/<query>/query.ts` is the feature query boundary.
- `queries/<query>/generated/query.sql.ts` is the runtime SQL snapshot.
- `queries/<query>/generated/query.meta.ts` is the generated query model metadata.

## Architecture as a Framework

The feature layout treats architecture as a framework contract, not a naming convention:

```text
boundary/
  boundary.ts
  child-boundary/
  tests/
```

- A folder is a boundary.
- `boundary.ts` is that boundary's public surface.
- Child boundaries are child folders that repeat the same rule.
- `tests/` is the verification group owned by that boundary.
- Cross-boundary tests should go through `boundary.ts`, not internal helper files.

## Default shape

- `boundary.ts`: the single feature boundary public surface for request parsing, normalization, and response shaping
- `queries/<query>/query.ts`: the generated query boundary for DB-facing SQL execution
- `queries/<query>/boundary.ts`: optional compatibility or feature-specific validation around the generated query boundary
- `tests`: the feature-local verification group, including a thin `tests/<feature>.boundary.test.ts` Vitest entrypoint for the mock-based lane
- `queries/<query>/tests`: the query-local verification group, including a thin `queries/<query>/tests/<query>.boundary.ztd.test.ts` Vitest entrypoint for the DB-backed mapper lane
- add more child boundaries as child folders when one boundary grows; each child repeats the same `boundary.ts` plus `tests/` rule

`ashiba.config.json` owns the SQL roots, DDL source directory, formatting, and mapper/test lanes. Feature-authored boundary tests stay under `src/features/<feature>/tests/`, while query-local mapper assets stay under `src/features/<feature>/queries/<query>/tests/{generated,cases}`.
Use `src/features/_shared/*` only for feature-facing shared seams such as `FeatureQueryExecutor`.
Keep driver-neutral helpers in `src/libraries/*`, driver or sink bindings in `src/adapters/<tech>/*`, and keep `db/` reserved for DDL, migrations, and schema assets.

Use `ashiba feature query refresh <feature-name> <query-name>` after SQL-only edits to refresh `generated/query.sql.ts` and `generated/query.meta.ts`. Add persistent cases under `src/features/<feature>/queries/<query>/tests/cases/` with the fixed app-level DB-backed runner.
When you are on the boundary lane, treat it as query-local: `src/features/<feature>/queries/<query>/tests/<query>.boundary.ztd.test.ts`, `src/features/<feature>/queries/<query>/tests/generated/`, and `src/features/<feature>/queries/<query>/tests/cases/` move together, while the feature-root `src/features/<feature>/tests/<feature>.boundary.test.ts` stays on the mock-based lane.

## Import Paths

Prefer stability at recursive boundary seams over one blanket import style.

- Keep local, nearby references relative when they naturally move with the same boundary.
- Stabilize only shared references that are likely to break when a boundary is split and moved deeper, such as `src/features/_shared/*` or `tests/support/*`.
- One workable tactic is package `imports` such as `#features/*` and `#tests/*`, or an equivalent alias that works in both TypeScript and runtime resolution.
- Minimum rule: do not let deep relative imports become the public boundary contract.
- When a boundary depends on another boundary, make the dependency obvious by importing its compiled ESM entrypoint with `.js` specifiers, such as `./boundary.js` or `../boundary.js`, rather than walking through internal files.
- Pragmatic exception: designated shared seams such as `src/features/_shared/*` and `tests/support/*` may use stabilized root-level aliases because those files are shared support seams, not another boundary's private implementation.

## Sample feature

If you enabled the starter flow, `smoke` is the removable teaching feature.
Copy its shape for the first real feature, then delete it once the project has a real slice of its own.
In the starter flow, `smoke` also shows the DB-backed path through `@ashiba-ts/testkit-adapter-pg` and the preferred named-parameter SQL style through its feature-local SQL sample.
