# Formatter Decision

## Decision: REMOVE `query format`

`query format` is a carefully guarded transformation: it parses the original
and formatted SQL, compares formatter-normalized AST output, and declines to
write when comments would be lost. The focused fixture demonstrated that the
guard works: a line comment made the candidate unsafe and `--check` failed.

That is useful implementation behavior, but it is not a retained Ashiba
product boundary:

- Formatting is not part of deterministic binding metadata, source hashing,
  freshness, native execution, or PostgreSQL contract proof.
- `normalizeSqlSource` used by model generation only normalizes line endings;
  it does not call `query format`.
- No current product/example/CI workflow invokes the command.
- General formatters and AI can reconstruct a proposed formatting diff. The
  application/reviewer remains the authority for accepting it.

The future removal is only the public optional command, its command-specific
configuration/docs, and command-specific helpers. It does **not** remove
`SqlFormatter` uses that remain independently owned by DDL-schema and
result-column processing.

No Scope or Golden Path change is required.
