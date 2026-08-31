# V5 select-change candidate

This change adds an optional minimum-priority filter to the existing
work-item listing. `NULL` keeps the previous behavior; a bound value returns
only rows whose priority is at least that value.

`regression.mjs` loads this candidate SQL asset, uses the canonical fixture DDL
and seed asset, and exercises both paths through native `mysql2/promise`.

Run from this directory while the disposable MySQL fixture is available:

```text
node regression.mjs
```
