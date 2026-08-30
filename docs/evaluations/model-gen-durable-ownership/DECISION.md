# Decision

## Model-generation workflow: REDUCE

Ashiba should **reduce** `model-gen` from the required/core AI-first workflow.
The named-parameter compiler and binder remain durable core, but the
committed/generated binding-artifact plus source-hash/freshness lifecycle no
longer has evidence strong enough to remain Ashiba's default product contract.

Arm C supplied the missing comparison: a strict TypeScript, native-`pg`,
PostgreSQL-backed application used visible canonical SQL, called
`compileNamedParameters()` once during controlled initialization, cached the
result, and used `bindNamedParameters()` without a committed duplicate binding
artifact, source hash, freshness command, or Ashiba CLI. It passed the same
behavioral oracle as Arms A/B. Controlled semantic drift reached the new SQL
directly, and a parameter-shape change was rejected by the current binder
before database execution.

The earlier KEEP argument was correct only under a conditional premise: **if an
application chooses a committed static binding artifact**, model-gen's exact
freshness check is a valuable fail-closed guard. It did not establish that the
artifact itself must exist. The scaffold analogy applies: a generator can
create state, the state can create drift, and a checker can prevent that drift;
this chain alone does not justify retaining the generated state or lifecycle.

## Sub-surface decisions

| Surface | Decision | Reason |
| --- | --- | --- |
| Named compiler and binder | KEEP (independent core) | Every arm needs deterministic lowering, value separation, and missing/unused rejection. |
| Committed/generated binding module as standard path | REMOVE from the proposed core workflow | Arm C reached equal checked behavior without duplicate state. |
| `sourceHash` and binding-artifact freshness as standard path | REMOVE from the proposed core workflow | Their target disappears in Arm C; they are conditional static-artifact proof, not execution proof. |
| `model-gen` CLI | REDUCE | Do not teach or require it in the default AI-first path. A later implementation must decide whether an optional static-artifact convenience warrants a retained/re-homed CLI after consumer migration. |
| All-driver artifact contents | no separate decision | Arm C live-tested pg. MySQL/MSSQL migration design requires its own evidence. |
| Shared SQL-resource / PostgreSQL-contract helpers located in `model-gen.ts` | no decision here | They are independent optional-capability consumers and must be separated before any implementation removal. |

## What this does and does not prove

The decision is not “AI can write it” and it is not a claim that static
artifacts are unsafe. It is an observed replacement operating model: direct,
controlled compilation is fast in the bounded measurement, retains the named
primitive's deterministic checks, eliminates duplicate source/artifact state,
and passes the same PostgreSQL behavioral oracle.

Model-gen remains better than an application-local hand-maintained static
artifact **when that artifact is chosen**. The strongest KEEP evidence is that
Arm A's `--check` rejected both semantic and parameter-shape source drift
before build/test/database. The strongest REMOVE evidence is Arm C: no artifact
means no artifact freshness lifecycle, while current canonical SQL still drives
the binder and runtime behavior.

`model-gen` still does not validate nullable PostgreSQL type resolution,
business semantics, result mapping, transaction behavior, or application tests.
All arms needed live PostgreSQL proof for an untyped nullable guard.

## Scope and implementation implication

This evaluation makes **no** product, Scope, Golden Path, public API, or
current documentation change. The current Scope still lists deterministic
binding metadata/source freshness as a current decision.

Scope change required for a future implementation: **yes**. Golden Path change
required for a future implementation: **yes**. The proposed direction is:

```text
canonical SQL
→ application-controlled direct compileNamedParameters cache
→ bindNamedParameters
→ native driver
→ application/live tests
```

That is a follow-up design/migration task, not an implicit change in this PR.
It must separately inventory selected-driver usage, re-home independent helper
exports, migrate references/distribution verification, and decide whether any
optional static-artifact convenience remains public.

## Evidence strength and reconsideration

Evidence strength: **medium**. It includes three bounded arms, one independent
Fresh Agent no-artifact application, shared PostgreSQL behavior checks,
semantic and parameter-shape controls, and compilation feasibility data. It is
not a broad population study, does not measure deployment bundling strategies,
and does not live-test direct compilation for MySQL/MSSQL.

Reconsider REDUCE only if a selected-driver/application class cannot use a
controlled direct compiler cache without material runtime or distribution cost,
or if multiple production-like no-artifact trials show an unmitigated safety or
review failure. Preference for generated files or a generic desire for fewer
commands is not enough.
