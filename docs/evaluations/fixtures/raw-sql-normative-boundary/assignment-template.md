# Fresh-agent assignment template

## Common packet

Implement the four query boundaries in your allocated candidate directory. PostgreSQL and the fixture schema are supplied by the runner. Preserve SQL as source files or exported string constants. Do not edit files outside the allocation. Do not inspect or change the evaluator. Your result will be tested by a separate runner.

Use ordinary Node.js and `pg`. Export exactly this surface from `submission.mjs`:

```js
export const queries = {
  search: { sql: '/* named canonical SQL */', async execute(client, input) { return (await client.query('/* positional SQL */', [])).rows; } },
  list: { sql: '/* named canonical SQL or a named SQL asset manifest */', async execute(client, input) { return (await client.query('/* positional SQL */', [])).rows; } },
  openItems: { sql: '/* named canonical SQL */', async execute(client, input) { return (await client.query('/* positional SQL */', [])).rows; } },
  ownedItems: { sql: '/* named canonical SQL */', async execute(client, input) { return (await client.query('/* positional SQL */', [])).rows; } },
  bindingEdgeCases: { sql: '/* named canonical SQL */', async execute(client, input) { return (await client.query('/* positional SQL */', [])).rows; } },
};
```

Every `execute` must resolve to a plain array of rows. `search` must use casts in null guards (for example, `cast(:status as text) is null`) so PostgreSQL can infer types. `list.sql` may be a named manifest for several complete SQL assets, but no raw runtime string may reach SQL. Do not claim test success based on your own report.

### Post-run interpretation note

The historical treatment heading below says “PostgreSQL general knowledge only,” but G0 did **not** receive an unconstrained programming task. Every treatment received the common packet above, which already fixes canonical named SQL, null-guard query shape requirements, a finite list boundary, and the prohibition on raw runtime strings reaching SQL. The final report therefore describes G0 as **common task specification only / no Ashiba-specific guidance**. This note changes no historical prompt or scored result; it prevents the treatment label from overstating what was absent.

## G0 insert — PostgreSQL general knowledge only

No product guidance is supplied. Implement safe, maintainable PostgreSQL application queries according to your ordinary knowledge.

## G1 insert — candidate minimum Ashiba rules

Apply only the seven rules in `initial-candidate-rules.md`. No named product mechanism or implementation recipe is supplied.

## G2 insert — current relevant Ashiba guidance

Apply the repository's current runtime-boundary, named-binding, optional-condition, Safe Sort, and SSSQL guidance. Existing adapter APIs and generated metadata may be used when useful.

## Allocation record

Each dispatched cell records treatment, replicate, model profile, permissions, start/end time, supplied packet hash, candidate tree hash, evaluator version, and outcome in `evidence/results.json`.
