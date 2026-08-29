# Dynamic Sort Timeline

| Date / commit | Event | Meaning for this evaluation |
| --- | --- | --- |
| 2026-05-26 `6521842` | Metadata-backed dynamic mechanisms introduced | Established the former adapter/metadata direction; it did not compare CASE SQL with application literal composition. |
| 2026-05-29 `5317a33` | Safe Sort documentation added | Described whitelist, source identity, insertion coordinates, and runtime profile. |
| 2026-06-06 `4e4fe7c` | Compression and Safe Sort composed in the PostgreSQL adapter | Increased coupling and metadata surface. |
| 2026-06-07 `c2417dc` | Stable-suffix-aware insertion added | Shows the former runtime had non-trivial placement responsibility. |
| 2026-08-15 `96ebceb` | Support Inbox safe-sort metadata expanded | Demonstrates expansion pressure for a larger application shape. |
| 2026-08-29 PR #98 / `bc67816` | Final driver-surface reduction merged | Removed the Safe Sort runtime/metadata package surface; it did **not** decide which application SQL shape is best. |

The Dynamic Mechanism Value Ablation found that both a reviewed rules-only map
and the former runtime rejected hostile, unknown, and invalid sort input. The
runtime additionally proved profile freshness, but fresh-agent repairs showed
no observed advantage in diff size, reruns, or false repairs. Its conclusion
was rule-only for the minimum product, not a preference for CASE expansion.

Current examples show two distinct post-runtime shapes:

- Support Inbox's `list-tickets.sql` has four CASE sort slots and a stable
  `st.ticket_id asc` tie-breaker. It is source-visible but approximately 337
  lines and amplifies each additional key/direction/slot.
- Ticket Queue's `src/tickets.ts` validates a finite map, inserts only
  source-controlled ordering terms at one stable anchor, rejects duplicates,
  and appends `t.id asc`.

Therefore, runtime removal and CASE adoption are separate decisions.
