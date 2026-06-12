---
"@ashiba-ts/cli": minor
---

Add `--returning all|minimal` to insert feature scaffolds.

Insert scaffolds still default to the previous all-column `RETURNING` shape. Passing `--returning minimal` generates an insert query that returns only the primary key, and the generated mapper cases preserve that shape when refreshed with `ashiba feature tests check --fix`.
