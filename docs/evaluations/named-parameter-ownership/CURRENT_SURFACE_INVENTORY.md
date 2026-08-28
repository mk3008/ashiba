# Current Surface Inventory

Inventory source: `abeb30f6a9d4daafd6f0fc242bedae7bf3628f60`, excluding detached Transfer and historical evaluations.

| Surface | Current role | Current consumer class | Durable reason today? |
| --- | --- | --- | --- |
| `@ashiba-ts/named-parameters` public package | compiler and runtime binder | Golden Path, adapters, reference app | Yes: common parameter identity and pre-execution missing/unused guard |
| `src/compiler.ts` | scans canonical `:name`/`@name`, renders indexed/named/anonymous bindings | CLI, project checks, contracts, adapters | Yes: selected cross-driver lowering and metadata coordinates |
| `src/index.ts` | `ParameterBinding`, `bindNamedParameters`, `NamedParameterError` | adapters and native pg reference | Yes: deterministic execution guard |
| package README and 2 test files | public API promise and scanner/binder proof | package distribution | Yes while package remains public |
| `ashiba model-gen` | emits `bindings`, `sourceHash`, result and optional metadata; `--check` detects staleness | Golden Path CLI | Yes; only part is parameter lowering |
| project/check/query/sql-resource | parse or render canonical named SQL, source identity, query metadata | CLI mechanics / optional tools | Mostly yes; exact named dependency varies |
| standalone PostgreSQL contract | lowers canonical SQL to PostgreSQL indexed syntax for describe/prepare | optional contract | Yes; independently valuable mechanical DB proof |
| PG/MySQL2/MSSQL adapters | bind compiled metadata before native driver calls | optional DBMS convenience | Yes only insofar as adapters remain; thinning is separately possible |
| Ticket Queue reference | direct `bindNamedParameters` + native `pg` | Golden Path reference | Yes |

## Measured implementation inventory

| Area | Files | LOC reference | Tests / notes |
| --- | ---: | ---: | --- |
| named package source | 2 | 68 | compiler and binder |
| named package tests | 2 | 76 | scanner, renderings, missing/unused |
| `model-gen.ts` | 1 | 178 | binding generation plus independent query analysis |
| adapter source touching binding | 3 | 1,418 | adapters have broader responsibilities too |

The package is public (`0.1.0`, published package configuration). Existing generated bindings, its exported types, `model-gen`, and canonical named SQL guidance would make any later change semver-breaking. That is a migration cost, not a retention entitlement.

## Consumers

Golden Path: named package, `model-gen`, `project check`, standalone PostgreSQL contract, Ticket Queue reference, driver adapters. Optional tooling: query analysis, SQL resource, safe sort and optional-condition coordinate metadata. Tests: named package, CLI metadata, adapter and reference tests. Detached experimental Transfer is not retain evidence.
