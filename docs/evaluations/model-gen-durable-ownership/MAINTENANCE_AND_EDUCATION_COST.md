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

## Additional Arm C reassessment

Arm C resolved the question the original two-arm comparison left open. It did
not choose a static artifact at all: it loaded the visible SQL, compiled at a
controlled initialization boundary, and retained the compiled statements in an
in-memory application cache. It passed strict TypeScript, candidate tests, and
the shared PostgreSQL oracle with the same named-binding safety.

This removes—not relocates—the following obligations for that application:

| Obligation | Static artifact workflow | Arm C no-artifact workflow |
| --- | --- | --- |
| generated TypeScript binding files | committed and reviewed | none |
| source/artifact duplicate state | yes | none |
| source hash / exact freshness command | required for proof | no target exists |
| SQL-only semantic edit repair | regenerate/review artifact | restart/rebuild uses changed SQL |
| parameter-shape edit with stale binding | freshness must reveal it | current compiler/binder reveals missing value |
| Ashiba CLI / agent education | generate and check commands | compiler/binder concept only |

The direct compilation cost did not make this operating model impractical in
the bounded measurement: the reference eight-query set had a 0.0529 ms median
and a synthetic 1000-query set 2.2286 ms. This is not a universal production
startup claim; it is enough to reject compile cost as evidence that a committed
artifact is intrinsically necessary.

The static-artifact check remains useful where an application independently
chooses static output. The durable question, however, is whether Ashiba must
own and teach that choice. Arm C says no on the current evidence. The required
workflow should therefore be reduced rather than preserving generated state
solely because a checker can validate it.
