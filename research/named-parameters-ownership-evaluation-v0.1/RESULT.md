# Named Parameters Ownership Evaluation v0.1

## Decision

- Existence classification: `REDUCE`.
- Repository ownership classification: `REHOME_STANDALONE_CANDIDATE`.

Retain only a grammar-agnostic lexical compiler from one canonical meaningful named SQL representation to indexed or anonymous driver bindings, plus strict object-to-values binding. It never writes values into SQL and must not grow into semantic analysis, schema knowledge, execution, loaders, or application architecture.

The package centralizes assurance serious inline implementations would duplicate: lexical false-positive avoidance, repeated-name driver semantics, and strict missing/extra detection. Its runtime cost is zero dependencies and cacheable one-pass compilation. `both` canonical syntax and NamedRendering are unnecessary public generality; native named drivers need no lowering.

## Driver, lexical, and probe conclusion

Indexed/reusable, anonymous positional, and native named are sufficient stable binding classes. Rendering is a driver concern, not a DBMS adapter. Current PostgreSQL lexical support follows the desired boundary: unknown grammar passes through, safe normal-context markers lower, protected lexical regions remain unchanged. Other common lexical forms are bounded scanner profiles, not a reason for an AST parser.

Baseline build/typecheck/test passed (8 tests). The credible inline helper was completed and passed. The unchanged package also passed the required real node-postgres/PostgreSQL probe: readable canonical SQL with three values, repeated `:status`, casts, hostile value separation, missing/extra rejection, deterministic `$n` output, and correct result behavior (`NODE_POSTGRES_PROBE_PASS`).

The anonymous real-driver probe remains `UNTESTED`: no SQLite/anonymous driver was already installed, and installing/provisioning one solely for symmetry was outside the frozen bounded approach.

## Raw SQL Rules implication and next decision

Raw SQL wording can remain: “Parameters are named by meaning at the human SQL review surface.” It may allow safe lowering without naming a package or DBMS syntax.

## Human product decision

Human product decision: **NO — do not sponsor or rehome a standalone package.** The technical evaluation remains `REDUCE` / `REHOME_STANDALONE_CANDIDATE`, meaning the responsibility is coherent enough to support such a package. However, that does not establish sufficient product value to justify creating and maintaining another active package. Leave the existing implementation in archived Ashiba as research/reference. Do not publish, rehome, or revive it.
