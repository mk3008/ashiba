# Architecture comparison

| Responsibility | Candidate A: application artifact | Candidate B: generic helper | Current thin driver |
| --- | --- | --- | --- |
| Canonical named SQL | Application asset | Same | Same |
| Compile names/positions/hash | Development-time tooling | Development-time tooling | Development-time tooling |
| Value ordering/stale check | Application | Tiny helper | Adapter |
| Optional subtraction | None | Generated ranges + splice | Adapter rewrite |
| Sort semantics | Application whitelist | Application whitelist | Application profile |
| Sort placement | Application coordinate | Generic coordinate splice | Adapter splice |
| pg/pool/transaction | Application | Application | Application client + wrapper |
| Observation/masking/retry | Application/ecosystem | Helper/ecosystem | Adapter |

Candidate A is credible for named binding only if development-time compilation
is correct for the desired lexical corpus. The fixture shows runtime lexing is
not essential to direct pg execution. It does not yet justify deleting the
adapter's coordinate rewrite, sort placement, observation, masking, or retry
surfaces.
