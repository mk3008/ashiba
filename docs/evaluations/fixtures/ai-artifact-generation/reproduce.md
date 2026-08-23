# Reproduction

From the repository root:

```powershell
corepack pnpm --filter @ashiba-ts/cli build
node docs/evaluations/fixtures/ai-artifact-generation/runner/collect-b-baseline.mjs
node docs/evaluations/fixtures/ai-artifact-generation/runner/submit.mjs replicate-1
node docs/evaluations/fixtures/ai-artifact-generation/runner/submit.mjs replicate-2
```

The B collector is an evaluation observation of the current generator only. C
replicates receive the fresh-agent packet, not its output. The live oracle and
negative-control runner are executed after candidate submission; their exact
commands are added with their durable records.
