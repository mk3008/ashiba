# Maintenance and education cost

Persistent snapshots require per-query generated SQL/resource files, a fleet
schema, reader compatibility, regeneration rules, source hashes, database and
driver profile tracking, PostgreSQL/catalog/parser follow-up, docs, command
help, tests, CI convention, and AI instructions. At 3000 fixture queries the
two temporary fleet JSON files alone were about 26.7 MB; actual snapshot also
writes two per-query artifacts.

The current comparator retains useful classification logic, but it does not
compare every stored field and it escalates all source-hash changes, including
comments, to `needs-review`. Thus a material share of its work is ordinary Git
review while the artifact lifecycle remains permanent.

No current application, CI, package, example, or dogfood consumer was found.
The only proven special use is optional PostgreSQL fleet review. Teaching every
AI/user a snapshot/refresh/compare lifecycle to support an unadopted optional
workflow is not justified by the evidence.

The lower-cost replacement is either ordinary Git plus focused tests or, where
fleet PostgreSQL classification is actually needed, a temporary derive-now
generic tool. The latter has its own DB reproducibility cost and must earn its
own maintenance budget in a follow-up; it is not an automatic Ashiba feature.
