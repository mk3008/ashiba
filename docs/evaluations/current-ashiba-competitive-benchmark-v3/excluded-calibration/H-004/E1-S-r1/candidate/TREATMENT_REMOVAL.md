# Native data access

The runtime execution path uses `pg` directly with parameterized SQL in
`src/application.ts`.

No data-access code-generation dependency, artifact, configuration, or
generation command remains in this candidate. The retained runtime dependency
is `pg`; application SQL and transaction ownership remain visible in the
application module.
