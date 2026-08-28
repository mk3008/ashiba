# Surface Reduction Map

`REMOVE` means a credible future named-removal plan could stop owning it. It is not an implementation instruction. `UNKNOWN` means the current evidence is insufficient to claim a reduction without creating a replacement surface.

| Surface | Current responsibility | pg direct needed? | mysql2 driver named needed? | mssql driver named needed? | All-native/mixed classification | Evidence |
| --- | --- | --- | --- | --- | --- |
| canonical `:name` convention | cross-driver source identity | no | no | no | REMOVE only with Scope/Golden Path change | current Scope and source graph |
| named package | compiler/binder public API | no | no | no | REDUCE/REMOVE candidate | all direct arms work |
| `compiler.ts` | scanner/lowering/coordinates | no for plain execution | no for plain execution | no for plain execution | UNKNOWN | safe-sort/optional coordinates rely on it |
| `bindNamedParameters` | common missing/unused guard | no | no | no | REDUCE/REMOVE candidate, with safety loss | live unused evidence |
| `NamedParameterError` | uniform errors | no | no | no | REMOVE with binder | package API |
| `ParameterBinding` | rendered SQL + identity mapping | no | no | no | REDUCE/REMOVE candidate | adapters/model-gen use it |
| model-gen binding generation | native binding metadata | no for direct SQL | no if mysql2 owns lowering | no if mssql direct | REDUCE candidate | result/optional analysis remains |
| generated binding metadata | SQL/values mapping + source hash | no for plain native execution | no for plain native execution | no for plain native execution | REDUCE candidate | contract/other metadata may remain |
| source-hash freshness | generated-binding freshness | not for removed artifact | not for removed artifact | not for removed artifact | REDUCE, not automatically REMOVE | PostgreSQL contract and SQL resource use hashes independently |
| `model-gen --check` | binding freshness | no if binding artifact vanishes | same | same | REDUCE candidate | source-level inspection |
| command/help/docs | public binding workflow | no | no | no | REDUCE/REMOVE candidate | catalog source |
| named tests | compiler/binder proof | no | no | no | REMOVE with surface | package tests |
| safe-sort coordinate conversion | canonical-to-PG positions | possibly a different basis | n/a | n/a | UNKNOWN | compiler prefix rendering is used today |
| optional-condition coordinates | canonical-to-PG positions | possibly a different basis | n/a | n/a | UNKNOWN | compiler prefix rendering is used today |
| PostgreSQL contract | DB-derived parameter/result facts | yes | n/a | n/a | UNCHANGED | independently retained optional proof |
| adapter binding code | guard before native driver | not if adapters/direct path slim | driver named can replace lowering, not unused guard | same | REDUCE candidate | adapters import binder/types |
| driver compatibility matrix | selected-driver behavior | yes | yes | yes | UNCHANGED | supported DBMS responsibility |
| migration/public compatibility | existing packages/generated artifacts | yes | yes | yes | UNCHANGED | public package and examples |

With the decision to keep named core, no immediate removal is authorized. If the decision changed, the plausible removal set would be compiler/binder API, binding-only metadata and checks, related adapter binding sections, and their docs/tests—but only after separately resolving coordinate metadata and contract identity. This is not a small, free deletion.
