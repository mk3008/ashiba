# Lint Decision

## Decision: REDUCE `lint`; REMOVE advisory `query lint`

The current top-level `lint` command mixes two ownership classes.

### Retain: narrow DDL-backed static integrity checks

The evaluated fixtures show deterministic nonzero failures for:

- a SQL column reference absent from the supplied DDL model;
- a literal inserted into a column with an incompatible DDL type.

These are mechanically decidable early checks. They are not the final
semantic authority, but they can prevent a known class of stale SQL/DDL
mismatch before an application path is exercised.

The narrow retained responsibility is therefore: **static SQL references and
literal values checked against an explicitly supplied DDL model**. It should
not be expanded into a general schema policy engine.

### Remove: advisory query-lint rules

`query lint` reports unused CTEs, dependency cycles, duplicated joins/filters,
templating risks, large CTEs, and optional join-direction advice. The current
fixture's unused CTE is reported as a warning while the standalone command
exits zero. These rules guide review but do not establish executable truth,
and they impose ongoing parser/rule/false-positive policy maintenance.

AI, editor diagnostics, code review, and a project-local policy script can
reconstruct this advice at lower permanent product cost. The follow-up must
not retain a generic query-lint framework merely because the DDL guards remain.

### Limitation

The representative `:value` parameter used in both a bigint and text context
was accepted by the current DDL lint. The retained boundary must therefore be
documented honestly: it catches selected DDL-backed mechanical mismatches, not
parameter semantics, named-binding validity, or business correctness. Those
remain owned by named-parameter core and application/live tests.

No Scope or Golden Path change is required.
