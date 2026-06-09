---
"@ashiba-ts/cli": minor
---

Add optimistic-lock-aware update scaffolding driven by `ashiba.config.json`.

Projects can configure `mutation.optimisticLock.versionColumn` and `scaffold: "when-column-exists"`. When an update scaffold targets a table with that column, Ashiba now generates a visible SQL pattern that increments the version column and checks an `expected_<versionColumn>` parameter in the `WHERE` clause.

Imported non-select query boundaries no longer enable optional-condition compression automatically.
