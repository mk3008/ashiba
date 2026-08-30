# Arm C — primitive-only, no committed binding artifact

## Input boundary

Arm C was a new clean-room Fresh Agent trial. Its only Ashiba input was the
packed `@ashiba-ts/named-parameters` package. The harness prohibited
`@ashiba-ts/cli`, `model-gen`, source hashes, freshness commands, and generated
or committed static binding modules. It supplied frozen DDL, business
acceptance, a concise consumer prompt, consumer guidance, and explicit
evaluation-only isolation instructions. See `evaluation/arm-c-input/`.

The consumer prompt did not teach a model-gen workflow. The harness fixed only
the comparison boundary: visible `.sql`, strict TypeScript, direct
`compileNamedParameters()` during controlled initialization, a cache rather
than per-execution compilation, `bindNamedParameters()`, and native `pg`.

## Observed application

The Fresh Agent created a feature-local Vertical Slice application with seven
visible SQL files and `src/tickets/queries.ts`. That module reads the SQL at
controlled application creation, compiles each query once, and returns an
in-memory `TicketQueries` cache. It is application source, not a generated
binding module: it contains no precompiled SQL, source hash, model-gen header,
or freshness convention.

It used a finite reviewed map for the four accepted sort terms, native `pg`
for execution and transactions, and the named binder for every application
value. Application code, query integration, and tests are TypeScript under a
strict `tsconfig`.

## Results

| Check | Result |
| --- | --- |
| npm install from packed named-parameters only | pass |
| strict `tsc --noEmit` | pass |
| build | pass |
| candidate tests | pass (1 test) |
| runner-owned PostgreSQL oracle | pass |
| canonical SQL visible | pass |
| no committed/generated binding artifact, source hash, or CLI | pass |
| missing/unused rejection | pass |
| filters, finite sort/tie, pagination, get, hostile value isolation | pass |
| native transaction and injected audit rollback | pass |

The first live run exposed PostgreSQL SQLSTATE `42P08` for untyped nullable
guards, the same class of issue previously seen in Arms A and B. A bounded
repair changed only the visible SQL guards to explicit `text`/`bigint` casts.
The final oracle passed. This is PostgreSQL type-resolution evidence, not an
artifact/freshness failure and not a no-artifact architecture failure.

## Change behavior

The controlled semantic and parameter-shape controls are in
`ADDITIONAL_DRIFT_CONTROLS.md`. With no duplicate binding module, a changed
canonical SQL string is the string compiled at the next controlled
initialization. A parameter addition caused `bindNamedParameters()` to reject
the unchanged caller with `ASHIBA_MISSING_PARAMETER` before database execution.

## Limits

This is one Fresh Agent and one PostgreSQL application. It demonstrates a
viable operating model; it does not prove every SQL-loading or deployment
strategy is equally suitable. The candidate was removed after evidence capture;
the committed input boundary, oracle, drift harness, raw results, and
reproduction instructions preserve the experiment without turning it into a
product example.
