# Maintenance and education cost

## Ashiba-owned cost today

Maintaining the workflow requires Ashiba to own all of the following:

- a public CLI command and API result shape;
- exact TypeScript artifact rendering and byte-level check semantics;
- a source-hash convention and generated-file compatibility;
- three driver renderings for every generated module, even where an
  application uses only one driver;
- compiler/rendering tests, command catalog, package documentation, guides,
  agent guidance, reference scripts, and consumer/distribution verification;
- migration of applications that import generated modules; and
- agent/user education to generate and check output after each SQL change.

The exact command has material active use in two current references and three
repository verification paths. Existing use demonstrates adoption, not by
itself durable ownership value.

## What the primitive already owns

`compileNamedParameters()` deterministically derives lowering and parameter
order from canonical SQL. `bindNamedParameters()` preserves the lower-level
safety boundary: values remain separate from SQL, repeated placeholders are
ordered, and missing/unused names fail before the driver. Neither primitive
requires a source hash or committed generated module.

## Smallest plausible alternative

An application can use the compiler directly at build time or at a controlled
application initialization boundary, then bind through the existing runtime
primitive. The current Ticket Queue reference is an in-repository example of a
small application-owned generation script.

That alternative does not receive Ashiba's generic byte-for-byte freshness
gate. It must rely on ordinary source review, its own simple build step if it
chooses an artifact, typechecking, and application/live tests. It does not
lose deterministic named binding.

## Questions the ablation resolves

The primitive-only fresh-agent arm determines whether this smaller alternative
can satisfy the same strict TypeScript and PostgreSQL behavior without being
taught the CLI/artifact lifecycle, and whether the same follow-up SQL change
causes more repairs or unsafe drift. Its result belongs in
`ARM_A_B_COMPARISON.md` and the decision record rather than being inferred
from code size.
