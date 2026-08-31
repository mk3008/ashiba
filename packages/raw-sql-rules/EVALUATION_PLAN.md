# Evaluation plan (preregistered)

## Question

Can `RULES.md` constrain a named-parameter-capable Raw SQL application enough
to keep data access safe, reviewable, and AI-friendly without a framework?

## Frozen input

`RULES.md` v0 is frozen before judgment. Its SHA-256 is stored in
`evidence/rules-v0.sha256`. Subsequent edits require an amendment record and
preserve previous evidence.

## Method and criteria

Each task card is judged against the frozen Rules without implementation
reasoning. A scenario passes when its expected allow/reject/clarify outcome
follows directly from the text and deterministic checks agree where applicable.

Every scenario marked `-I` in the manifest requires two independent fresh
judgments. A disagreement triggers a deciding judgment or a Rule amendment. A
critical underconstraint is a path from external input to SQL syntax, an
unreviewed SQL asset choice, an architecture escape, schema discovery from
migration history, or a type/behavior contract claimed without the real
database and driver. An overconstraint is a reasonable Raw SQL solution blocked
without a safety/review reason.

## Driver and execution boundary

The model driver supports named placeholders natively; SQL Server-style `@name`
binding is the documented capability model. Fixtures use portable `:name`
notation only for source readability. No package is installed and no live
database is claimed. Structural checks are mechanical; all semantic conclusions
are rubric/fresh-agent observations.

## Convergence criteria

Converge only when no critical escape is known, key boundary judgments are
consistent, an intentional overconstraint probe has a clear answer, Rules are
readable in a few minutes, and the package remains dependency-free.
