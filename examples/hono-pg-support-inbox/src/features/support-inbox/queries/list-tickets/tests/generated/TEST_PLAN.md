# support-inbox/list-tickets Test Plan

This generated file is library-owned and may be refreshed by Ashiba.

- Unit tests are mapping-contract tests, not database state management or SQL logic tests.
- Generated mapper cases use lightweight synthetic DB result SQL, usually a SELECT without a FROM clause, to prove DB-to-TypeScript DTO mapping.
- For INSERT/UPDATE/DELETE queries, generated mapper cases prove RETURNING row compatibility only.
- TypeScript-to-DB inputs, affected rows, persisted state, transaction behavior, defaults, constraints, triggers, and read-after-write behavior belong in route/integration/traditional DB-backed tests.
- Generated mapper cases do not prove source SQL business logic, parameter business meaning, row cardinality, affected-row counts, business mutation targets, transaction isolation, locking, or final database state.
- Ashiba does not infer or check single-row cardinality after scaffolding; row handling in `query.ts` is customer-owned code.
- DTOs are customer-owned after scaffolding. Ashiba may report drift and expected column/type/nullability, but it should not silently rewrite customer-owned DTOs.
- Nullability is conservative. If Ashiba cannot prove a value is non-null, generated contracts and diagnostics should prefer nullable output.
- DDL is loaded from the configured DDL source directory; missing DDL should fail mapping verification instead of silently skipping it.
- Human/AI-owned SQL logic cases under `cases/` may use ZTD/CTE shadowing and the real source SQL.
- Prefer Zero Table Dependency for mapping tests.
- Performance tests: prefer traditional DB-backed tests.
- Keep human-authored cases under `cases/`.
