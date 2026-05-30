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

## Default Style

Generated SQL uses the formatter options stored in `ashiba.config.json`:

```json
{
  "format": {
    "sql": {
      "identifierEscape": "none",
      "parameterSymbol": ":",
      "parameterStyle": "named",
      "indentSize": 4,
      "keywordCase": "lower",
      "commaBreak": "before",
      "valuesCommaBreak": "before",
      "andBreak": "before",
      "orBreak": "before"
    }
  }
}
```

The full generated config includes the complete option set. The defaults prefer lowercase keywords, named parameters, and leading commas.

## Explicit Formatting

Use `query format` when you want to review or apply formatting to an existing SQL file:

```bash
npx ashiba query format src/features/users/queries/list/list.sql --diff
npx ashiba query format src/features/users/queries/list/list.sql --write
```

Use `--check` in a local gate or CI when formatting drift should fail the command:

```bash
npx ashiba query format src/features/users/queries/list/list.sql --check
```

## Safety Boundary

Ashiba SQL formatting is AST-based, not CST-based. That means formatting can be useful, but comments and exact trivia must be treated carefully.

Before writing, Ashiba checks:

- token sequence before and after formatting
- token count before and after formatting
- SQL comments are not dropped
- formatter output round-trips to the same normalized SQL

If these checks fail, `query format --write` skips the write and reports the reason.

## SSSQL Interaction

`query optional add`, `query optional refresh`, and `query optional remove` do not reformat the whole SQL file.

Those commands use the rawsql-ts SSSQL rewrite plan. Ashiba writes only when the plan says the edit is limited to the intended optional branch. If the change would require a full SQL reformat, Ashiba reports that manual editing is required and aborts the automatic rewrite.
