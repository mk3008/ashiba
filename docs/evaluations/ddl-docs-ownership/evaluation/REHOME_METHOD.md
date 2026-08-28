# Rehome Method

The experiment copied only `packages/ddl-docs-cli/src` into a temporary
Transfer-local tool directory. It compiled the copy against the existing
workspace dependency tree, then redirected a temporary copy of
`scripts/generate-transfer-docs.mjs` to that local CLI output.

The experiment did not modify package source, root scripts, Transfer source, or
tracked generated docs. Temporary source, build output, generated output, and
the temporary script were removed after the observed check, generation, drift,
and review-plan results were recorded in `../raw-results.json` and
`../REHOME_EXPERIMENT.md`.
