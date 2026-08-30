# Fresh-agent provenance

This reference originated in the TypeScript clean-room rerun recorded in
`docs/evaluations/release-readiness/VSA_TYPESCRIPT_RERUN.md`. The fresh agent
received packed CLI and binding tarballs, frozen DDL/business acceptance, the
concise consumer prompt, and the consumer AGENTS.md. It did not receive Ashiba
source, existing examples, evaluations, another candidate, or previous output.

The runner independently passed generation freshness, strict TypeScript
typechecking, candidate tests, and a PostgreSQL behavioral oracle before
adoption. The repository copy uses `workspace:*` only so repository CI tests
the current packages; that is not the clean-room npm-distribution proof.
