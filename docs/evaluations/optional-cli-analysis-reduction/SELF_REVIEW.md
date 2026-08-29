# Optional CLI Analysis Surface Reduction — Self Review

## Cycle 1 — implementation consistency

- Confirmed all five removed commands are absent from registration and the
  command catalog; direct invocation now returns Commander unknown-command
  errors.
- Confirmed query uses retains AST-first discovery, confidence/unresolved
  fields, strict parse failure, and explicit fallback.
- Confirmed lint now only evaluates explicit DDL-backed table, column, and
  obvious literal type facts. Parameter conflict inference and advisory rules
  are no longer called.
- Confirmed `sql-format.ts` and lower-level `SqlFormatter` consumers remain
  for retained generation and DDL/result metadata work.

## Cycle 2 — documentation and verification

- Replaced current SQL Format promotion with a migration guide and removed
  the guide from navigation.
- Updated a historical fixture link only because deleting the public guide
  otherwise broke the docs build; its evidence remains labeled historical.
- Added focused query-uses and DDL-lint tests, then ran repository typecheck,
  build, test, docs build, `pnpm verify`, and `git diff --check` successfully.
- Attempted explicit PostgreSQL live verification. It did not reach test setup
  because the pre-existing local container rejected its documented password;
  the run created no schema and no credentials or database state were changed.

## Triage

| Item | Status | Rationale |
| --- | --- | --- |
| Removed command residue | resolved | Registration, catalog, dedicated modules, and current docs are removed together. |
| Retained formatter implementation | intentional | Retained consumers use it independently of the removed command. |
| Live PostgreSQL verification | environment blocked | The unrelated 28P01 credential mismatch prevents safe reuse of the existing container. |

## Review readiness

Ready for human review subject to the documented local live-verification
environment limitation. No product-design blocker or unreviewed scope change
remains.
