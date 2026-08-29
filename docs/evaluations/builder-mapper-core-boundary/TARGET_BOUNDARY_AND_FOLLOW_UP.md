# Target Boundary and Follow-Up

## Architecture decision

**Architecture: CORE-BOUNDARY-ACCEPTED.** The Golden Path is sufficient for a
small Builder Mapper product when it is not expanded into an execution,
migration, schema-pull, logging, or CI platform.

The accepted target is:

```text
Ashiba core: canonical SQL + named binding + build-time freshness
Application: finite reviewed SQL selection + native driver + mapping/policy
Optional proof: focused inspection and DB contract tools
External: migration lifecycle and database/tooling integration
```

## Follow-up implementation boundary

1. **Migration surface removal plan.** Inventory external compatibility before
   removing `ddl migration generate`, `ddl-diff`, public applyPlan types, and
   current promotion/docs; publish breaking migration guidance to native or
   dedicated application-owned migration tooling. Do not change DDL-backed
   lint, query uses, SQL-resource, or PostgreSQL contract in that task.
2. **Finite-sort application guidance.** Update application examples only in a
   separately authorized implementation task. Use finite literal composition
   for bounded menus and variants for bounded business shapes; do not recreate
   the Safe Sort runtime.
3. **SQL-resource practicality follow-up.** Re-evaluate ownership only if a
   real application or CI consumer appears, or if its independent contract
   proof can be demonstrated without duplicating existing metadata.

## Reconsideration triggers

Reopen this boundary only if a Builder Mapper core task cannot be completed
without migration generation, a current machine consumer relies on applyPlan,
a safe finite-composition control cannot keep external input out of syntax, or
new evidence shows optional proof must enter the normal Golden Path.
