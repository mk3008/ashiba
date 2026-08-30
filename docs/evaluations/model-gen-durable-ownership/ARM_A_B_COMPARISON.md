# Arm A / B comparison

Both arms used the same frozen ticket schema and behavioral acceptance. Both
ultimately passed strict TypeScript, candidate tests, and a runner-owned
PostgreSQL oracle covering visible SQL, named binding, hostile values,
missing/unused rejection, filters, all four finite reviewed sort modes and
stable ties, pagination, get, native transaction, and rollback.

| Measure | Arm A — current workflow | Arm B — primitive-only |
| --- | --- | --- |
| Ashiba input | CLI + named package | named package only |
| Lowering source | `model-gen` generated module | application-owned static module derived with compiler |
| Source hash | yes | no |
| Generic freshness check | byte-for-byte `--check` | no |
| Initial live SQL repair | typed nullable status guard | typed nullable list guards |
| Change task | optional `get` status guard | same guard |
| Source files changed for change | SQL, generated module, app, tests (4) | SQL, static module, app, tests (4), plus emitted dist (2) |
| Required workflow command | `generate`, then `check:generated` | no Ashiba command; manual synchronization |
| Intentional source/artifact drift | detected before build/test/DB | build passed with stale binding retained |
| Final PostgreSQL oracle | pass | pass |

## Change-exercise interpretation

Arm A deliberately changed SQL first. Its check failed before compilation,
testing, or database execution and named the stale output. Regeneration was
deterministic. It did not catch PostgreSQL type resolution; the live oracle
caught that, as it should.

Arm B achieved the requested behavior without the CLI, but the fresh agent
created a static artifact and manually kept it synchronized. The controlled
source-only drift passed its existing build. An application could choose a
runtime compilation or implement a correct local freshness check, but the
latter recreates the core lifecycle under evaluation.

## Independent safety conclusion

The named primitive is independently valuable in both arms: it lowers SQL,
keeps hostile values separate, and rejects missing/unused names. The
model-generation workflow adds a different proof: canonical SQL and a committed
precompiled binding module remain exactly synchronized. It is not a SQL
semantic, type, result-mapping, or transaction proof.
