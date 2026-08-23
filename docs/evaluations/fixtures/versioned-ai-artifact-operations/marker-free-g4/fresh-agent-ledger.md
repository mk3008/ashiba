# Marker-free Fresh Agent ledger

Both agents began from commit `f25411a`. They received ordinary SQL maintenance
requests only. The dispatcher gave no expected index, previous marker
coordinate, product generator source, or hidden answer.

| Replicate | Requested change | Initial verifier state | Agent repair | Runner-owned live result | Human coordinate editing |
| --- | --- | --- | --- | --- | --- |
| Formatting | Reformat CTE/SELECT and add an ordinary comment without semantic change. | SQL byte change made the source hash stale. | Updated only the placement artifact's source hash and index through normal `scripts/test.mjs` feedback. | PostgreSQL 5/5 checks passed after offline install. | 0 |
| Structural | Split filtering/projection into separate CTEs without changing result or ordering semantics. | SQL structure and placement offset changed, so old artifact was stale. | Updated only the placement artifact's source hash and index through verifier/test feedback. | PostgreSQL 5/5 checks passed after offline install. | 0 |

Each agent first ran the normal fixture test; neither was instructed to manage
coordinates. Their worktrees initially lacked installed `pg`, so the dispatcher
performed offline install and then ran the same live oracle. This is an
environment setup distinction, not human artifact intervention.
