# Distribution surface experiment and decision ledger

## Purpose and method

This is a contemporaneous record of the distribution-surface optimization loop. Each candidate was packed from the branch, then given to a clean-room consumer with a fixed PostgreSQL challenge and no repository checkout or workspace links. The method measures a small native-driver application, rather than treating a successful repository test as package-distribution evidence.

The entries state current evidence and current decisions. They do not claim that a removed, absent, or optional capability is permanently unnecessary.

## Baseline: package guidance before tuning

- **Hypothesis:** The opening CLI guidance makes adapters and testkit appear normal enough that a fresh consumer may miss the smaller native-driver path.
- **Problem being addressed:** A consumer needs a quick, trustworthy answer to what runs in production and what is optional during development.
- **Change tried:** None. This was the control measurement.
- **Why this was the smallest plausible change:** It isolated distribution guidance before considering a CLI, API, package, or architecture change.
- **Clean-room observation:** A consumer completed canonical SQL, build-time lowering, native `pg` execution, real PostgreSQL contract checks, and rollback proof. It needed package README material, declarations, and several CLI help pages to assemble the route.
- **Metric / qualitative evidence:** Classification was `package-usable-with-friction`; four live tests passed; final verification passed in 6.6 seconds. Three meaningful reworks occurred: PostgreSQL optional-predicate casts, conservative contract nullability, and workflow assembly. No human or fixture blocker occurred.
- **Decision:** Revise first-read guidance.
- **Reason:** The control proved that the capability existed but was not sufficiently self-describing at the first package surface.
- **Remaining uncertainty:** The apparent wording conflict could have been harmless to other consumers.
- **Future evidence for reconsideration:** Multiple independent consumers naturally choose adapters/testkit only when they need their stated compatibility or testing purpose.

## Iteration 1: native runtime orientation in the CLI README

- **Hypothesis:** A short package-local statement of the baseline path will make native execution and adapter/testkit optionality clear without adding a mechanism.
- **Problem being addressed:** The baseline opening pointed readers to a fuller external workflow before stating the smallest execution boundary.
- **Change tried:** Changed only the opening of `packages/cli/README.md` to state: canonical SQL -> build-time lowering/metadata -> separate values -> native driver. It states that the application owns pool, transaction, and business semantics, and that adapters/testkit are optional surfaces.
- **Why this was the smallest plausible change:** It corrected the observed first-read ambiguity without changing commands, exports, package boundaries, or optional capabilities.
- **Clean-room observation:** The consumer cited the README, selected direct native `pg`, installed no adapter or testkit, and completed four standalone PostgreSQL contracts plus live rollback proof. A separate audit found no caller-value interpolation in its runtime boundary.
- **Metric / qualitative evidence:** Four package/file groups and four focused help commands were inspected. The candidate remained `package-usable-with-friction`, with three meaningful reworks and zero human or environment blockers.
- **Decision:** **Keep.**
- **Reason:** The new text was directly used to choose the intended smaller path; it neither prescribed an application architecture nor hid optional capabilities.
- **Remaining uncertainty:** It did not provide an executable compile/bind recipe or eliminate command-level exploration for contracts.
- **Future evidence for reconsideration:** A holdout consumer treats the orientation as prescriptive, or fails to find the native path from it.

## Iteration 2: compiler/binder recipe at the owning package

- **Hypothesis:** A compact executable example where the public compile and bind APIs live will remove declaration hunting while preserving the native driver as execution owner.
- **Problem being addressed:** Iteration 1 understood the architecture but had to infer exactly how `:name` SQL became precomputed metadata and driver values.
- **Change tried:** Added a general PostgreSQL example to `packages/named-parameters/README.md`: compile at build time, bind with object values at runtime, then call the native pool with separate SQL and values. It explicitly prohibits interpolation, quoting, and escaping of values into SQL text.
- **Why this was the smallest plausible change:** The named-parameters package owns these APIs. No API, generated format, CLI, adapter, runtime parser, or application scaffold changed.
- **Clean-room observation:** The consumer used the README route without declaration hunting and completed native `pg` execution. It observed bigint as `string`, timestamps as `Date`, missing/unused-name rejection, bounded sorting, and transaction rollback.
- **Metric / qualitative evidence:** One Ashiba runtime package was installed; zero adapters/testkits and zero workspace links were used. Final verification passed in about three seconds after two ordinary consumer reworks: a readonly TypeScript compatibility copy and an explicit PostgreSQL cast for an optional predicate.
- **Decision:** **Keep.**
- **Reason:** The example was directly used and replaces implementation/type inference with a small, generic native-driver path.
- **Remaining uncertainty:** It does not make the CLI contract/drift workflow one-shot or improve PostgreSQL contract nullability precision.
- **Future evidence for reconsideration:** A new clean-room consumer ignores the recipe, still must inspect declarations, or adds an unnecessary wrapper because of the wording.

## Convergence: do not change package topology in this loop

- **Hypothesis:** The remaining CLI-install friction might justify bundling a companion package or otherwise changing package topology.
- **Problem being addressed:** In the two tuning candidates, installing the packed CLI alone attempted to obtain `@ashiba-ts/named-parameters` from the public registry and returned 404; a catalog companion tarball was needed for those runs. The later holdout completed CLI help and contract work with the frozen catalog, so the exact distribution condition needs reproduction.
- **Change tried:** No topology change. The branch was frozen after the two evidence-supported documentation changes and tested with a holdout.
- **Why this was the smallest plausible change:** A packed `workspace:*` dependency already becomes a semver dependency. Publication/release state is a distinct cause from README clarity; bundling, deleting commands, or adding source links would have conflated them.
- **Clean-room observation:** The holdout independently completed four real contract write/check operations and native execution, but exact CLI command syntax still required help exploration.
- **Metric / qualitative evidence:** The registry 404 was observed in two candidates; it was not reproduced under the holdout's frozen catalog path.
- **Decision:** **Defer; do not add a bundled compiler or alter boundaries.**
- **Reason:** Current evidence shows a release/distribution-closure question, not that the product needs a larger runtime or package mechanism.
- **Remaining uncertainty:** Whether a normal public-registry install works under release ordering, and whether a single-tarball offline contract path is a product requirement.
- **Future evidence for reconsideration:** Reproduce failure after the companion is published, or establish a supported offline single-tarball requirement.

## Frozen-candidate holdout: Inventory Reservation Queue

- **Hypothesis:** The two retained documentation changes are not merely tuned to the Purchase Request challenge.
- **Problem being addressed:** A single consumer can overfit the distribution surface to its domain and query shapes.
- **Change tried:** No product change after freeze. A new clean-room consumer implemented an Inventory Reservation Queue with list, get, reserve, and event SQL against the selected tarballs.
- **Why this was the smallest plausible change:** It changed business language, schema, query shapes, and transaction behavior while preserving the same distribution and PostgreSQL boundary.
- **Clean-room observation:** The consumer used four canonical SQL files, packaged lowering, native `pg`, application-owned transactions, four live contracts, bigint-as-string, and rollback. It installed one runtime Ashiba package and no adapters or testkit.
- **Metric / qualitative evidence:** Final verification passed in 12.9 seconds; 127 authored source/test/script lines and 1,565 generated lines were reported; three reworks occurred; human blockers were zero.
- **Decision:** **Keep the frozen candidate.**
- **Reason:** It supplies independent, non-repository evidence that the retained path supports a different small native PostgreSQL application.
- **Remaining uncertainty:** One additional PostgreSQL consumer does not cover other drivers, custom parsers, scale, concurrency, or many users.
- **Future evidence for reconsideration:** Multiple clean-room consumers or another driver consistently require an omitted mechanism for safety or discoverability.

## Feature absence index

| Feature / capability | Current status | Why not part of the core | Evidence | Reconsideration trigger |
| --- | --- | --- | --- | --- |
| Mandatory driver adapter or testkit | Optional, not core | Fresh consumers completed native execution and verification without either; their stated compatibility/testing roles remain available. | Iterations 1–2 and holdout installed zero adapters/testkits. | Direct-driver consumers repeatedly cannot meet a demonstrated requirement. |
| Runtime SQL parser | Absent | Build-time compiler plus precomputed binder supplied ordered values while keeping the native driver visible. | Both tuned candidates and holdout used compile/bind, never a runtime parser. | A validated dynamic-query need cannot be met while retaining parameterized execution. |
| Mandatory repository/mapper/UoW scaffold | Absent | Application-owned pool, transaction, rollback, and release were small and observable. | All consumers implemented native ownership without a framework. | Multiple fresh consumers show repeated safety-critical boilerplate that a smaller mechanism cannot address. |
| Bundled companion compiler / topology rewrite | Deferred | The observed failure points to release closure, not missing runtime behavior. | Two registry 404 observations; contradictory frozen-catalog holdout result. | Reproducible post-publication failure or an explicit offline single-tarball requirement. |
| CLI command removal | Not adopted | There is no evidence that the command surface itself caused failure; focused help was sufficient when available. | Consumers used help to find contract operations. | Evidence that discoverability improves by a tested reduction without losing verification. |
