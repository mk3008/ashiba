# Arm B — primitive-only fresh agent

## Input boundary

Arm B received no Ashiba repository source, CLI tarball, command catalog,
existing application, or workflow instruction. It received only the packed
named-parameter package, frozen DDL/acceptance, concise consumer prompt,
consumer guidance, and separate harness instructions. See
`FRESH_AGENT_INPUT_BOUNDARY.md` and `evaluation/arm-b-input/`.

## Initial implementation

The fresh agent independently created a strict TypeScript VSA application with
seven visible feature-local SQL files, native `pg`, four finite reviewed sort
SQL variants, a native transaction, and an application-owned static
`generated-bindings.ts` module. Its local script imported
`compileNamedParameters()` but did not use Ashiba's CLI, source hash, or
freshness convention. The application called `bindNamedParameters()` before
every native-driver execution.

Initial npm install, strict typecheck, build, and candidate tests passed. The
first independent PostgreSQL oracle failed (SQLSTATE 42P08) because nullable
list guards lacked explicit PostgreSQL casts. One bounded repair added text and
bigint casts to all four list SQL variants and manually synchronized the static
bindings. The same oracle then passed filters, sort/ties, pagination, get,
hostile-value isolation, missing/unused rejection, transaction commit, and
rollback.

This failure is a SQL correctness concern, not a metadata/freshness concern;
the current Arm A needed the analogous cast repair too.

## Primitive-only change exercise

The worker then received the same maintenance instruction as Arm A: add an
optional typed `status` guard to `get`. It changed `get.sql`, the
application-owned binding module, application code, generated `dist` files,
and tests. Typecheck, build, candidate tests, and the PostgreSQL oracle passed.

No Ashiba freshness command was available or used. The worker reports that it
manually synchronized the binding module.

## Drift control

The runner copied the accepted Arm B candidate, made a source-only comment
change in `get.sql`, and ran its existing `npm run build`. That build passed:
its application-local `generate` script checked a header and SQL-file count but
did not compare compiled binding content with canonical SQL. The stale static
binding remained undetected.

This is not a claim that every primitive-only application must be unsafe. A
careful application could compile at a controlled initialization point or own a
correct local comparison. It is evidence that obtaining equivalent build-time
drift proof requires the application/agent to deliberately recreate a
freshness mechanism; the named compiler/binder alone does not provide it.

## Surface observed

| Measure | Result |
| --- | --- |
| Ashiba packages | one: `@ashiba-ts/named-parameters` |
| Ashiba commands | none |
| Static binding artifact | application-owned `generated-bindings.ts` |
| Source hash / generic freshness | absent |
| Initial bounded repairs | output-directory/tooling plus one PostgreSQL cast repair |
| Change files | 4 source files plus 2 emitted `dist` files |
| Change drift failure | no automatic stale failure; manual artifact synchronization |
| Final PostgreSQL oracle | pass |

## What this arm proves and does not prove

It proves that the named compiler/binder primitives are sufficient to build and
change a realistic strict TypeScript/native-pg application without the CLI.
It does not prove equivalent source/artifact drift protection or a lower total
maintenance cost: the agent naturally introduced a static artifact but did not
implement a correct freshness check.
