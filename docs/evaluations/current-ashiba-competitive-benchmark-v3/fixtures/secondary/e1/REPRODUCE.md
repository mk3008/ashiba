# Reproduction

Select the baseline using the predeclared primary result rule, then materialise
it outside the repository evaluation tree:

```text
node materialize-e1-cell.mjs --cell E1-D-r1 --snapshot <durable-snapshot> --destination <outside-repository>
set DATABASE_URL=<runner-admin-url>
node runner.mjs --arm D --candidate <cell>/candidate/dist/application.js --source-root <cell>/candidate --baseline-manifest <cell>/baseline-manifest.json --output <cell>/evidence/e1.json --forbidden "drizzle-orm" --forbidden "drizzle-kit"
```

The run packet must preserve the selected snapshot hash, exact forbidden scan,
candidate commands, source diff, primary G1 oracle output, pre-cleanup state,
and cleanup result before temporary resources are removed.
