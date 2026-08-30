# Failure replacement matrix

| Failure / change | Current snapshot/compare | No-artifact replacement | Final authority |
| --- | --- | --- | --- |
| Formatting or comment-only SQL | Source hash causes review | Git diff/hash and review | Git/review |
| Predicate change | Source hash only; no behavior proof | Git candidate plus application/live test | Application/live test |
| Parameter add/remove/order | Contract comparison | Direct compiler comparison; binder missing/unused rejection | Compiler/binder plus tests |
| Result shape change | Result/driver contract comparison | Temporary PostgreSQL describe/prepare comparison | PostgreSQL/application mapping test |
| Table/column mutation | Dependency or prepare classification | Query uses/lint candidates plus temporary PostgreSQL sweep | PostgreSQL/live test |
| Type/nullability/enum/domain/view/function mutation | Portable contract rules | Derive-now PostgreSQL/catalog comparison | PostgreSQL facts; review for uncertain cases |
| PostgreSQL prepare failure | `execution-breaking` | Derive-now native prepare sweep | PostgreSQL |
| Query add/remove | Fleet membership | Git file add/delete and discovery | Git/review |

The matrix separates source/text detection (ordinary tools), named binding
(compiler/binder), database truth (PostgreSQL), and application behavior. The
only material gap left by removing snapshots is compact fleet-wide PostgreSQL
semantic classification. That gap is a candidate for a generic derive-now tool,
not evidence that committed artifacts are required.
