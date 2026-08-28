# Source, Package, and Documentation Alignment

Current source catalog contains `feature contract check`. A fresh execution of
published `@ashiba-ts/cli@0.3.0` lists `query`, `tests`,
`generated-mapper`, `scaffold`, and `import` under `feature`, but not `contract`;
the observed command resolves to feature help. This is source/package/docs
version skew, not a dead current command. Root README currently foregrounds the
scaffold/testkit path. Current packed CLI comparison remains buildable after
building `named-parameters` before CLI; direct npm workspace packing was not
available in this PowerShell invocation.
