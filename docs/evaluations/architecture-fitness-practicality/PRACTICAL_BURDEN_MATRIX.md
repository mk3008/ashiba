# Practical Burden Matrix

| Area | Benefit | Burden | Verdict |
| --- | --- | --- | --- |
| named metadata | order-independent identity and set drift detection | regenerate after SQL edits | acceptable/localized |
| native driver | familiar direct execution | application owns mapping/transactions/logging | natural |
| nullable filters | visible guards, no compression runtime | predicates remain visible SQL | acceptable |
| finite sort | static safe choices | many choices create CASE SQL | application concern |
| optional tooling | on-demand deterministic proof | explicit invocation/layout/artifacts | keep optional |
