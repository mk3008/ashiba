---
title: SQL Format
---

# SQL Format

Ashiba formats SQL when it creates new scaffolded SQL files.

The goal is not to take ownership of every SQL file in your repository. SQL is yours, so Ashiba keeps formatting conservative:

- new scaffolded SQL is formatted with Ashiba's default style
- existing SQL is not reformatted unless you explicitly ask for it
- SSSQL commands do not use formatting as a side effect
- unsafe formatting is skipped instead of written
- writes refresh generated query metadata when the SQL belongs to a feature query

## Default Style

Generated SQL uses the formatter options stored in `ashiba.config.json`:

```json
{
  "format": {
    "sql": {
      "identifierEscape": "quote",
      "identifierEscapeTarget": "minimal",
      "parameterSymbol": ":",
      "parameterStyle": "named",
      "indentSize": 4,
      "keywordCase": "lower",
      "commaBreak": "before",
      "cteCommaBreak": "after",
      "valuesCommaBreak": "before",
      "andBreak": "before",
      "orBreak": "before",
      "joinOnBreak": "before",
      "oneLineMaxLength": 100
    }
  }
}
```

The full generated config includes the complete option set. The defaults prefer lowercase keywords, named parameters, minimal identifier escaping, leading commas for most lists, trailing commas between CTEs, and width-limited one-line constructs. `JOIN ... ON` stays compact while it fits within `oneLineMaxLength`; longer join conditions fall back to an indented `ON` continuation.

## Explicit Formatting

Use `query format` when you want to review or apply formatting to an existing SQL file:

```bash
npx ashiba query format src/features/users/queries/list/list.sql --diff
npx ashiba query format src/features/users/queries/list/list.sql --write
```

When `--write` changes a feature query SQL file, Ashiba also refreshes `generated/query.meta.ts` in the same query boundary. Formatting should not create metadata drift.

Format every SQL file under the configured `sqlRoots` in `ashiba.config.json`:

```bash
npx ashiba query format --all --write
```

Use `--check` in a local gate or CI when formatting drift should fail the command:

```bash
npx ashiba query format src/features/users/queries/list/list.sql --check
npx ashiba query format --all --check
```

## Safety Boundary

Ashiba SQL formatting is AST-based, not CST-based. That means formatting can be useful, but comments and exact trivia must be treated carefully.

Before writing, Ashiba checks:

- SQL comments are not dropped
- formatter output round-trips to the same normalized SQL

If these checks fail, `query format --write` skips the write and reports the reason.

Ashiba still reports token counts as diagnostic information. Token counts may change when the formatter applies SQL-normalizing rewrites such as adding `as` for aliases, omitting explicit default `asc`, or rendering PostgreSQL-style casts as `cast(... as type)`. Those changes are allowed only when the formatted SQL round-trips to the same normalized AST output.

## SSSQL Interaction

`query optional add`, `query optional refresh`, and `query optional remove` do not reformat the whole SQL file.

Those commands use the rawsql-ts SSSQL rewrite plan. Ashiba writes only when the plan says the edit is limited to the intended optional branch. If the change would require a full SQL reformat, Ashiba reports that manual editing is required and aborts the automatic rewrite.
