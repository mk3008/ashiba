# Fresh Agent ledger

The evaluator created two independent worktrees at commit `6c6824e`, then sent
only the ordinary change request below. Neither request told the agent to
update, generate, or manually synchronize an artifact.

| Replicate | Normal request | First state | Verification feedback and repair | Human intervention | Final result |
| --- | --- | --- | --- | --- | --- |
| A | Add independently optional `fromCreatedAt`/`toCreatedAt` SQL conditions and align requirements. | SQL-only change would make both O0/O1 hashes stale. | Agent ran fixture tests, then updated the affected source hashes and the O0 output. It also added the two O1 optional segments/ranges. | None after dispatch. | `TEST_OK`; O0/O1 verifier accepted. The diff touched 4 files, all local to search. |
| B | Rename `inbox.sql` to `support-inbox.sql` and align references/requirements. | The existing O1 source path would be missing and the old artifact would become orphaned. | Agent ran the fixture test, then renamed the per-query artifact, updated manifest/source path/hash/sort anchor, and adjusted the rename assertion. | None after dispatch. A sandbox write permission was needed solely to run the test in its worktree. | `TEST_OK`; O1 verifier accepted. The rename did not touch search metadata. |

This is behavior evidence, not proof that every agent will repair every
artifact. It does show that normal verification feedback can drive repair
without a human understanding coordinates or hash values beforehand.
