# Starting baseline

This evaluation starts at merged PR #62 (`39207a1`) and PR #63 (`d7566aa`).

- #62 established a candidate raw-SQL boundary, but did not decide which
  runtime mechanism owns named binding, optional processing, or ordering.
- #63 established a small `pg` application using a runtime named lexer and
  complete SQL assets, including three-state optional semantics and finite
  business ordering. Its human acceptance was explicitly bounded and did not
  authorize product removal.

Current source facts:

- `model-gen` calls `compileNamedParameters` at development time to generate
  PostgreSQL positional SQL, ordered names, a source hash, sort insertion
  coordinates, and optional-condition binding coordinates.
- `compilePostgresQuery` verifies source hashes at runtime, maps ordered names
  to values, and only applies coordinate edits when optional compression or
  Safe Sort is requested. It does not lex canonical named SQL at runtime in the
  normal precomputed-binding path.
- The current adapter additionally provides a `pg` execution wrapper,
  observability, error normalization/retry classification, parameter masking,
  profile checks, and stale-artifact rejection.
