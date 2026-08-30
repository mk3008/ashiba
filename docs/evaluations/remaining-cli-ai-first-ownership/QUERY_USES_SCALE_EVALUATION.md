# Query-uses scale evaluation

The generator and raw results are in `evaluation/query-uses-scale/`.
It creates Small (20), Medium (300), and Large (3,000) SQL/QuerySpec catalogs
with aliases, schema qualification, unqualified columns, joins, CTEs,
subqueries, comments, identifier-looking string literals, duplicate columns,
`SELECT *`, near names, and a separate parser-failure case.

Arm A ran `ashiba query uses`; Arm B was an ordinary-tools `rg` control.
An independent Fresh-Agent runtime was unavailable, so this is not presented
as a Fresh-Agent benchmark. Arm C is the table/unit DDL organization experiment.

| Size | Table recall A/B | Table precision A/B | Column recall A/B | Column precision A/B |
| --- | --- | --- | --- | --- |
| Small | 1.0 / 1.0 | 1.0 / 0.85 | 1.0 / 0.941176 | 1.0 / 0.842105 |
| Medium | 1.0 / 1.0 | 1.0 / 0.833333 | 1.0 / 0.9 | 1.0 / 0.818182 |
| Large | 1.0 / 1.0 | 1.0 / 0.833333 | 1.0 / 0.9 | 1.0 / 0.818182 |

At Large scale, table lookup took 3,743.657 ms through Ashiba and 1,585.818
ms for lexical `rg` on this Windows machine. This is not a speed-win claim:
`rg` overreported table candidates and both overreported and missed column
uses. AST results were exact for this generated truth set. The parser-failure
control exited nonzero by default; explicit fallback reported one fallback
match.

This is a durable generic SQL analysis primitive, not Builder Mapper core.
The current QuerySpec-shaped discovery is a limitation before any rehome.
Token and credit telemetry are unavailable.
