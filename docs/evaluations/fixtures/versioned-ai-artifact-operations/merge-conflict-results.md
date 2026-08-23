# Git merge and revert results

These commands used real temporary Git branches rooted at `6c6824e`.

| Case | Branch changes | Merge result | Conflict files | Interpretation |
| --- | --- | --- | --- | --- |
| O0 global manifest, different queries | A changed the `search` entry and B changed the `inbox` entry in one compact global JSON manifest. | Content conflict. | 1: `o0/global-artifact-manifest.json` | A global versioned asset creates an avoidable coordination point even when the queries differ. The merge was aborted after recording this result. |
| Different queries | A added a comment to `queries/search.sql`; B added a comment to `queries/inbox.sql`. | Auto-merge succeeded. | 0 | Per-query assets do not create a global-manifest conflict for independent query changes. |
| Same query | A and B added different adjacent lines to `queries/search.sql`. | Content conflict as expected. | 1: `queries/search.sql` | The tested conflict is the canonical SQL itself; no artifact file added an excess conflict. The merge was aborted after recording this result. |

For versioning behavior, each artifact is ordinary committed JSON: `git
checkout <commit>` restores SQL and its matching metadata together, while `git
revert <artifact commit>` produces a normal reviewable inverse diff. The
repository keeps no external metadata service or hidden generator state.
