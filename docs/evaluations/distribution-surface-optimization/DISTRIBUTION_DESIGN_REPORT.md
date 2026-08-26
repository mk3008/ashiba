# Distribution design report

## What problem was being optimized?

Ashiba packages should let a small application retain ordinary database SQL, derive binding metadata during development, and execute through its native database driver. The optimization target was not fewer features in isolation. It was whether a consumer who has only packed artifacts can discover the smallest correct route without mistaking optional adapters, test helpers, or framework-like architecture for production requirements.

## What was the experimental method?

The baseline and each candidate were packed as public package tarballs. A fresh consumer received a fixed challenge, those artifacts, and a disposable PostgreSQL 16 endpoint. It had no repository checkout, workspace links, documentation website, sample application, or prior trial. The consumer had to implement canonical SQL, build-time lowering, native-driver execution, and real PostgreSQL contract evidence; a separate reviewer checked the resulting boundary. After two small guidance changes, the chosen tarballs were frozen and exercised by a distinct Inventory Reservation Queue holdout.

This is exploratory evidence, not a general usability study: there were one baseline, two tuning candidates, and one holdout, all on PostgreSQL.

## What surfaces were tested?

- Packed CLI and named-parameters package READMEs, tarball manifests, and selected command help.
- Canonical `:name` SQL, build-time lowering to driver placeholders, and separate values supplied to native `pg`.
- PostgreSQL-derived parameter/result contracts, including a false bigint-as-number negative control and stale-source rejection in the tuning challenge.
- Application-owned pool lifecycle and transaction/rollback behavior.
- A second domain with list, get, mutation, audit-event, and bounded sort behavior.

## What survived?

Two small documentation changes survived the loop.

First, the CLI README now names the baseline execution path as canonical SQL, development-time lowering/metadata, separate values, and a native driver. It also says that application pool, transaction, and business behavior stay at the native-driver boundary, while adapters and testkit are optional.

Second, the named-parameters README now shows the package-owned public path: compile canonical named SQL at build time, bind precomputed metadata at runtime, and pass SQL plus values to the native pool. It makes the non-interpolation boundary explicit.

The direct evidence is narrow but concrete: the first change was cited by a fresh consumer when it chose native `pg` without adapters or testkit. The second was used without declaration hunting to build the compiler/binder path. The holdout repeated the same core path in a different domain and passed its full verification in 12.9 seconds.

## What was removed or rejected, and why?

No user-facing feature was deleted. The loop deliberately rejected adding a mandatory adapter, testkit, runtime SQL parser, repository/mapper/UoW scaffold, or bundled compiler. These are current decisions based on observed smaller mechanisms, not claims that such capabilities are inherently wrong.

Fresh consumers used one named-parameters runtime package, zero adapters, and zero testkit packages. Their applications visibly owned native pool checkout, transactions, rollback, and release. Precomputed binding metadata preserved parameterized execution without a runtime parser. This is why those features remain optional or absent from the core, rather than because of a purely architectural preference.

Package-topology changes were also not made. Two tuning candidates observed a 404 when a packed CLI attempted to resolve its named-parameters dependency from the public registry. A frozen-catalog holdout later completed CLI help and contracts, so the condition is not yet cleanly reproduced. The evidence does not justify masking a publication/release-closure question by bundling or redesigning runtime packages.

## What evidence supports each major decision?

| Decision | Supporting observation | Limit |
| --- | --- | --- |
| Keep native-runtime orientation | A fresh candidate cited it, selected native `pg`, and left adapters/testkit uninstalled. | One primary tuning consumer. |
| Keep compiler/binder recipe | A fresh candidate used it without declaration hunting and completed native execution. | It does not teach the complete CLI contract workflow. |
| Keep adapters/testkit optional | Three clean-room exercises completed direct native paths without them. | PostgreSQL only; no comparison where their compatibility value is required. |
| Do not add runtime parser or scaffolding | Precomputed bind metadata and explicit native transactions were sufficient in all exercises. | No dynamic-query or large-team study. |
| Defer topology change | Two 404 observations, followed by a holdout that could continue under its catalog condition. | Registry/release state remains unresolved. |

## What remains intentionally outside Ashiba?

The application remains responsible for driver selection, pools, connection lifecycle, transaction boundaries, business semantics, schema migration policy, and any domain-specific repository organization. Optional adapters and testkit are not removed; they are simply not required for the baseline native execution path. Ashiba also does not turn application values into SQL literals: values remain separate until the driver boundary.

## What remains uncertain?

The experiments do not establish a public-registry installation guarantee for the CLI companion dependency, nor do they validate other drivers, PostgreSQL versions, custom node-postgres parsers, production migrations, high concurrency, large query catalogs, or broad user populations. PostgreSQL contract result nullability remained conservative (`unknown`) in the consumer checks, requiring manual types to permit `null`; this is honest fail-closed behavior but a discoverability and precision friction.

## What evidence would cause reconsideration?

Reconsider the retained README guidance if repeated independent consumers do not use it, find it prescriptive, or still require implementation/declaration hunting for the shown path. Reconsider mandatory mechanisms only if multiple direct-driver consumers demonstrate a safety or discoverability failure that a smaller change cannot solve. Reconsider package topology after a reproducible normal registry install following publication, or after a supported offline single-tarball requirement is established.

## Feature absence index

| Feature / capability | Current status | Why not part of the core | Evidence | Reconsideration trigger |
| --- | --- | --- | --- | --- |
| Driver adapter/testkit | Optional | Native applications completed all required execution and rollback work without them. | Three clean-room runs installed neither. | Direct driver cannot meet a required compatibility/testing need. |
| Runtime SQL parser | Absent | Build-time lowering and precomputed binding preserve values separately. | All runs used the smaller path. | Dynamic query needs cannot stay parameterized otherwise. |
| Repository/mapper/UoW scaffold | Absent | Native transaction ownership was clear and sufficient. | Consumers used explicit pool/transaction code. | Repeated safety-critical boilerplate across consumers. |
| Bundled compiler or topology rewrite | Deferred | Present evidence is about release closure, not missing behavior. | Two 404s and one non-reproducing holdout condition. | Reproducible post-publication failure or an offline requirement. |
