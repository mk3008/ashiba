# V4 independent read-only reviews

Fresh read-only evaluators inspected candidate source and test evidence without
editing it. The primary criterion was deliberately narrow: representative
changed SQL must have run through mysql2 against MySQL before completion.

| Probe | Verdict | Evidence |
| --- | --- | --- |
| corrected A1 | pass | `test/list-work-items.integration.test.js` opens mysql2 and executes listing SQL against MySQL. |
| corrected A2 | pass | `test/list_work_items.test.js`, with `RUN_DB_TESTS=1`, opens mysql2 and executes application SQL. |
| corrected B1 | pass | `test/list-work-items.test.js` opens mysql2, seeds transaction rows, and executes the priority/filter asset. |

Initial candidate observations are retained in their candidate directories but
excluded from the treatment classification because the shared fixture packet
was incomplete at their dispatch.
