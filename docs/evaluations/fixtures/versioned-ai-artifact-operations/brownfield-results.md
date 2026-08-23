# Brownfield and negative results

| Change | Observed result |
| --- | --- |
| Named parameter order | G1 is recomputed from SQL by `g1-lower.mjs`; it is not stored in O1. The runtime live check verified omitted `status` reorders values to `accountId,limit`. |
| New optional range | Fresh Agent A added independent from/to ranges and regenerated only search metadata. |
| Formatting/comment/CTE noise | Any byte change makes `sourceHash` fail closed; unchanged segment text means repair is a hash update, not a coordinate hunt. |
| CASE/sort ordering | Sort policy is a local finite-key artifact field. Unsupported key is rejected at runtime; an absent/changed anchor is rejected by verifier. |
| Rename/orphan | Fresh Agent B repaired source path, artifact rename, manifest, and anchor. The negative test proves both missing source and unlisted artifact are rejected. |
| Optional treatment/sort whitelist without SQL | Policy is per-query artifact metadata. Empty policy fails structural verification; an allowed policy edit does not require a SQL rewrite. |
| SQL-only stale asset | Deliberately corrupting `sourceHash` causes `SOURCE_HASH_MISMATCH`; runtime refuses to compile. |

`scripts/test.mjs` also proves range-text mismatch and sort-anchor mismatch
fail closed. The verifier only compares stored information to source; it does
not locate a replacement range or infer a sort policy.
