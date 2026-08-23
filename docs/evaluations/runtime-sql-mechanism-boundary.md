# Runtime SQL mechanism boundary evaluation

## Status

**partial.** The fixture has confirmed one lexical limitation in the current compiler and run an initial 200k-row PostgreSQL calibration. It has not completed the full N0–N4, O1–O3, or S1–S3 matrix; no product reduction follows.

## Current findings

The current generated PostgreSQL binding design is structurally N2-like: development-time `model-gen` produces positional SQL, ordered names, source hashes, and coordinate metadata; normal runtime validates hashes and maps names to values. The existing adapter adds separate execution, observations, masking, profile, and retry responsibilities.

The registered canonical lexical corpus exposed a calibration failure: current `compileNamedParameters` treats a pseudo-parameter inside a nested block comment as real. This is retained as evidence rather than repaired here, so the current compiler cannot be used as an unqualified correct N2/N3 oracle for the registered corpus.

A fixture-only development-time compiler that tracks nested block-comment depth
generated the same corpus into positional PostgreSQL SQL with ordered names
`id,id2,id,value,id,id`, preserved lexical pseudo-parameters, and rejected an
edited source hash before value mapping. Thus N2 is technically credible:
runtime needs only hash equality and `orderedNames.map`, not a SQL lexer. This
does not make the fixture compiler product-ready or repair the current product.

On the frozen 200k skewed dataset, O1 static guards and O2 direct predicates both produced BitmapAnd/Bitmap Heap Scan plus a top-N sort for the rare customer/status combination under forced custom and generic planning. Buffer/work shape was the same; millisecond differences are not a winner. O3 and additional optional states remain unmeasured.

The same runner now verifies O1 semantics for all omitted, explicit null,
customer rare value, status hot/rare values, and a mixed selective condition.
These cases preserve the registered omitted/null/value contract. They are
correctness evidence, not an all-seven-predicate performance matrix.

S1 demonstrates bounded whitelist composition of three keys, mixed direction, CASE business ordering, and an id tie-breaker while rejecting hostile, duplicate, and oversize input. Coordinate splice/S2 remains pending.

Source inspection now establishes S2's narrower additional responsibility:
development-time derives source and compiled insertion coordinates; runtime
validates the source hash and mechanically splices only a reviewed profile at
that coordinate. It does not infer placement from the SQL at every execution.
The application still owns allowed sort semantics, including the CASE ordering.

Named values remain a strong source-level rule. Node-postgres executes positional SQL plus an array but does not provide source-level named binding. The smallest ownership boundary remains unresolved while the lexical artifact compiler is incomplete.

## Architecture candidates

The [comparison](./fixtures/runtime-sql-mechanism-boundary/driver-boundary/architecture-comparison.md) separates application artifact use, a possible generic helper, and the current thin driver. Current evidence supports only the narrow conclusion that a correct development-time artifact can remove runtime SQL lexing from direct pg execution. It does not justify splitting or deleting the adapter's optional rewrite, sort placement, observation, masking, or retry surfaces.
