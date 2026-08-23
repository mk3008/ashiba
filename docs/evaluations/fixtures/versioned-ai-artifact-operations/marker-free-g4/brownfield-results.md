# Marker-free Brownfield results

| Scenario | Evidence |
| --- | --- |
| Single key | `name DESC` produced `3,2,1` in PostgreSQL. |
| Two keys / direction mix | `priority ASC`, `createdAt DESC` produced `2,1,3`; priority is an application-owned CASE expression. |
| Three keys | `priority DESC`, `createdAt ASC`, `name ASC` produced `3,1,2`. |
| Stable tie breaker | No requested key retains canonical `w.id ASC`, producing `1,2,3`. |
| Invalid/hostile input | Invalid direction, duplicate key, too many keys, and `DROP TABLE work_items` as a key are rejected before SQL execution. No runtime raw SQL input exists. |
| Formatting drift | Fresh Agent formatting regeneration passed verifier/test/live. |
| Structural SQL drift | Fresh Agent CTE restructuring regeneration passed verifier/test/live. |
| Application-only policy change | A separate Git commit added `priorityBusiness` solely in `application/list-ordering.mjs`; `scripts/test.mjs` passed and `git diff` named only that policy file. Placement artifact churn was zero. |

The mechanical verifier's negative controls reject stale hash, invalid index,
expected text mismatch, and local context mismatch. It cannot determine whether
the reviewed policy has the desired business meaning; native application/live
tests are the semantic authority.
