# G1 replicate 1 execution ledger

This is an append-only execution ledger, not a comparative result or ranking.
All cells used the frozen packet from `7988e3bedb84ee918c928afa33a58dbbcf826a37`.

| Cell | Candidate attempts retained | Runner result retained | Notes |
| --- | --- | --- | --- |
| G1-A-r1 | 1 | P | Initial live pass. |
| G1-P-r1 | 1 | P | Initial live pass. |
| G1-S-r1 | 2 | F then P | Repair 1 removed candidate-owned runner DDL. |
| G1-D-r1 | 1 | P | Initial live pass. |
| G1-K-r1 | 2 | F then P | Repair 1 corrected the null-assignee filter. |
| G1-G-r1 | 1 | P | Initial live pass. |

Each attempt directory has immutable command logs, before/after candidate
snapshots, runner results, database cleanup records, and a final SHA-256 evidence
manifest. The benchmark report will interpret all cells only after the complete
preregistered matrix and secondary controls are available.
