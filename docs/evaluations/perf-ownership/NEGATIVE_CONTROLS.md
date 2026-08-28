# Negative Controls

| Failure case | Ashiba detects? | Existing core detects? | No-perf workflow can detect? | Unique perf value? |
|---|---|---|---|---|
| Missing `limit` parameter | Yes, `perf run` exits 1. | Yes, named binding validates required names. | Yes. | No. |
| Unused `ignored` parameter | Yes, `perf run` exits 1. | Yes, named binding rejects unused names. | Yes. | No. |
| Missing explain path | Yes, file-existence rejection. | N/A. | Yes, ordinary file open fails. | No material value. |
| Fabricated 0.01 ms duration | No, accepted as meeting requirement. | N/A. | Review can require native output. | No. |
| Existing unrelated plan path | No, `params.json` accepted as explain evidence. | N/A. | Review can inspect content. | No. |
| SQL changes after measurement | No, follow-up evidence accepted. | Binding freshness is separate. | A project can include a query hash if needed. | No current value. |
| Different query/dataset reports | No, 10 ms versus 1 ms was classified faster. | N/A. | Plain report can expose identity fields. | No. |
| Generated measurement passed to diff | No, stored durations were unknown to diff. | N/A. | Plain JSON avoids incompatible formats. | Negative value. |

`scenario measure` only checks that `--explain` points at an existing project file. It does not open, parse, hash, or associate the file with SQL. `report diff` only reads numeric duration fields and performs arithmetic.
