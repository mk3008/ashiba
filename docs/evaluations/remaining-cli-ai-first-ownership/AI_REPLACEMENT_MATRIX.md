# AI-first replacement matrix

| Command | Replacement | Residual value | Decision |
| --- | --- | --- | --- |
| check/config/describe | repository scripts, local config, `--help` | none | REMOVE |
| project check | direct compiler verification rule | bulk convenience only | RULE-ONLY |
| model-gen | direct controlled compiler cache | static freshness only | prior REDUCE |
| lint | native DB/tests plus generic static analysis | offline DDL proof | REHOME |
| query uses | `rg`, layout, AI inspection | AST exactness/parse closure | REHOME |
| postgres-contract | PREPARE/catalog/tests | representation proof | REHOME |
| sql-resource | git/diff/live tests | fleet classification | NEEDS-FOCUSED-ABLATION |
