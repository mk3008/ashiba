# Reproduce

From this directory:

```sh
node scripts/verify.mjs o1
node scripts/test.mjs
node scripts/generate-o0.mjs
node scripts/verify.mjs o2 # expected failure: O2_REJECTED
node scripts/postgres-live.mjs
```

The committed `results/` records identify the observed environment and command
outcome. `clean-clone-results.md`, `merge-conflict-results.md`, and
`fresh-agent-ledger.md` record the corresponding independently executed steps.
