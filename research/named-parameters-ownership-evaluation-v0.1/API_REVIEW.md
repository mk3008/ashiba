# API review

| Capability | Classification | Decision |
| --- | --- | --- |
| Indexed rendering | ESSENTIAL | retain |
| Anonymous rendering | ESSENTIAL | retain |
| Strict missing/unused binding | ESSENTIAL | retain |
| Canonical colon syntax | JUSTIFIED | retain |
| Canonical at syntax / `both` | SPECULATIVE | remove from core |
| Named rendering | OUT-OF-SCOPE | native named drivers need no lowering |
| Configurable indexed prefix / anonymous token | JUSTIFIED | narrow driver configuration |
| Named prefix/suffix | OUT-OF-SCOPE | remove |
| unused-value escape hatches | JUSTIFIED | explicit application choice |
