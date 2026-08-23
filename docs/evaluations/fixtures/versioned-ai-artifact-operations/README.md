# Versioned AI artifact operations fixture

Evaluation-only fixture for operating AI-derived G2--G4/G5 metadata as a
committed asset. It changes no Ashiba product package.

`queries/` is canonical SQL. `o0/` is a deterministic owned-generator control;
`o1/artifacts/` is the candidate per-query versioned form; `o2/` deliberately
has no checked-in derived artifact. `scripts/verify.mjs` is a deliberately
small verifier: it validates registration, source existence/hash, exact
optional text/range, and the sort anchor. It never discovers an optional span,
sort rule, or bind ordering.

Run `node scripts/test.mjs` for the deterministic evaluation suite. See
`protocol.md` and `reproduce.md` for the operating procedure.
