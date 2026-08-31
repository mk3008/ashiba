# Data-access removal record

The final execution path uses only the native `pg` client and the fixed,
business-facing SQL in `src/application.ts`.

Removed state:

- the previous generator configuration and invocation script;
- its query input and derived TypeScript source/output artifacts;
- the package `generate` command.

No query-generation dependency, configuration, generated artifact, or
compatibility layer remains in this candidate.
