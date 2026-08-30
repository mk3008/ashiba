# Repair analysis

Each primary cell permits an initial response plus at most two candidate
repairs. A third unresolved candidate failure is final. Environment and
harness incidents are retained separately from candidate/tool repair.

**Observed.** The index records 67 preserved primary attempts across 48
cells. It records `additionalAttemptCount`, but does not include a normalized
causal repair taxonomy for all primary source evidence. This report therefore
does not assign individual additional attempts to SQL, API, type, generator,
or tool responsibility.

The per-cell factual matrix in [RESULT_MATRICES.md](./RESULT_MATRICES.md)
records first captured build/typecheck/test slots, final live state, frozen
treatment review, and retained additional-attempt count. The first runner
slot is `not-declared` in the primary source documents, so this report does
not reconstruct a first live-oracle result from later commands.

The raw attempt evidence remains the authority for first-pass build,
typecheck, test slots, final runner output, and finalization. Repairs should
not be compared by elapsed time: the protocol excludes wall time from
comparative interpretation.

The correction ledger distinguishes pre-scoring runner/packet defects from
candidate results and preserves the original evidence. No harness correction
is silently treated as a candidate repair.
