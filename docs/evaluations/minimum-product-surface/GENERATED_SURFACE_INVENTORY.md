# Generated Surface Inventory

| Artifact | Source / owner / stale handling | Classification |
| --- | --- | --- |
| lowered SQL + binding metadata | canonical SQL; deterministic compiler; generated and freshness-checked; never hand-edit | **keep-core** |
| standalone PostgreSQL contract JSON | canonical SQL + live development DB; stale check owned by contract command; manual TS types remain user-editable | **keep-optional** |
| `query.meta.ts` / `query.sql.ts` | canonical SQL; deterministic; generated, not hand-editable; tied to feature/model flow | **deprecate-remove** with generated feature architecture; preserve a smaller binding artifact path |
| feature `query.ts`, DTO/result/params | generated initial application-owned contract; user-editable; mapper drift checks | **deprecate-remove**; application can own plain types directly |
| feature boundary/input/workflow/output layout | scaffold source; user-editable architecture convention | **deprecate-remove** |
| mapper boundary tests / generated mapper checks | feature layout + editable contracts | **deprecate-remove** |
| ZTD wrappers, fixture types, logic case assets, `TEST_PLAN.md`, `analysis.json` | scaffold/testkit-owned convention; stale checks and test dependencies | **deprecate-remove** |
| safe-sort / optional compression metadata | canonical SQL + generated proof; adapter consumes; stale fails closed | **keep-optional** |
| SQL resource snapshots / migration SQL / perf reports | explicit user-directed dev artifacts; deterministic inputs but application owns apply/tuning | **keep-optional** |
| config, gate scripts/workflow/hook | generated integration artifacts; user owns later policy changes | **keep-optional** |
