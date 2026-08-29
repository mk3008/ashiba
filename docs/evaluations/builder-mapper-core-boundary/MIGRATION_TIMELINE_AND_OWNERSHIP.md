# Migration Timeline and Ownership

## Historical direction

| Commit | Event | Boundary implication |
| --- | --- | --- |
| `b451b4d` | Added `ddl migration generate`, DDL diff, migration information, and risk output | Began as a DDL drift/review tool, not Builder Mapper execution. |
| `fda61f5` | Added passive drift checks and risk suppression handling | Expanded migration-oriented policy and compatibility surface. |
| `55e096e` | Added git DDL inputs and a Support Inbox migration exercise | Added review workflow adoption, not runtime dependency. |
| `aff561a` | Added SQL output/execution/applyPlan evidence | Created multiple representations of a change. |

## DDL verification is not migration ownership

DDL is a useful optional verification input for a narrow, mechanically
decidable SQL check: table/column existence and literal-type incompatibility.
It can also support optional impact inspection and PostgreSQL contract work.
None of those needs Ashiba to own migration authoring, ordering, application,
rollback, deployment, or migration history.

```text
database / DDL source
  -> optional DDL-backed lint and impact proof
  -> application or dedicated tooling owns migration authoring and lifecycle
  -> application owns apply, rollback, deployment, and operational policy
```

## External alternatives

Dedicated migration libraries, native database migration tooling,
application-owned reviewed SQL migrations, and AI-assisted generation followed
by application review all preserve the Builder Mapper core. Their coexistence
is normal integration, not a missing Ashiba feature.

## Decision

**Migration: REMOVE-FROM-ASHIBA.** `ddl migration generate` is a situational
review convenience, but it is not required for canonical SQL, named binding,
metadata freshness, or native-driver handoff. Its permanent cost grows with
DDL AST coverage, ALTER variants, constraints/indexes, generated columns,
enums/domains, rename/type/backfill ambiguity, ordering, destructive policy,
three DBMS dialects, rawsql-ts compatibility, and a migration-specific test
matrix. That cost is not justified as Builder Mapper ownership.

This is a future implementation boundary, not a deletion performed here.
