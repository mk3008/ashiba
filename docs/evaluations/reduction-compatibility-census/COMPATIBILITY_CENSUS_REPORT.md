# Reduction Compatibility Census

## Status: partial — release decisions are ready; live migration execution is environment-blocked

This evaluation applies the settled Scope and Golden Path to legacy product
surfaces. Compatibility is migration information, not a retention argument.
The bounded registry and public-code census found no confirmed external Ashiba
consumer. GitHub code search returned only historical `mk3008/rawsql-ts`
documentation for the CLI before its rate limit was reached; this is weak,
non-consumer evidence, not proof of zero adoption.

The Scope verdict is `implementation-choice`: this is a release/removal decision
within the existing boundary, not a Scope extension. The native-driver Golden
Path remains unchanged.

See the individual censuses and decisions in this directory. After Docker became
available, the maintained Golden Path replacement was live-verified on a
throwaway PostgreSQL 16 instance. The generated consumer itself was not
rewritten, which is an explicitly bounded migration-metric gap. No product
change is proposed or made.
