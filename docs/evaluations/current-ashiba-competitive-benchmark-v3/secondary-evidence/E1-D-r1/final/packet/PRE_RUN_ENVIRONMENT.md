# E1 runner environment preparation

Before the runner imports an E1 candidate, the runner owner installs that
candidate's lockfile with the frozen Node 24 npm into the cell-local
`npm-cache` and `candidate/node_modules` directories:

```text
npm ci --ignore-scripts --cache <cell>/npm-cache
```

This is runner-owned environment preparation, not a candidate repair. It is
required because E1 materialization intentionally excludes `node_modules` from
the preserved baseline and exit source snapshots. The source manifest excludes
`node_modules`; the lockfile and command log remain durable evidence.
