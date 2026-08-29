# Capability Ownership Ledger

| Capability | Current location | Mechanical fact | Smallest plausible owner | Decision | Evidence / limit |
| --- | --- | --- | --- | --- | --- |
| named `:name` to `$n` binding | pg package + named core | values remain separate; missing/unused names reject | named core + generated metadata | REMOVE from pg package | named ownership remains settled; the preparation wrapper decorates rather than proves new binding facts |
| runtime source-hash comparison | pg package | metadata matches supplied SQL | build-time freshness; a retained transform-local verifier | REDUCE | source artifact remains independently useful; broad per-call package check is not independently justified |
| finite safe sort | core + pg package | public input belongs to reviewed finite map | application finite map and tests | REMOVE from runtime package | dynamic-mechanism ablation: hostile values rejected by both; no repair outcome advantage |
| optional-condition subtraction | pg package + generated coordinates | coordinate/binding artifact matches SQL before rewrite | narrow optional verifier, if productized | KEEP OPTIONAL / pending | ablation: stale cases rejected before DB call; artifact burden is material |
| driver representation profile | core + pg package | runtime caller claim equals generated contract claim | standalone contract boundary | REMOVE from preparation | package neither configures nor introspects pg parsers |
| PostgreSQL contract facts | core types + CLI | DB-derived parameter/result representation | standalone PostgreSQL contract | KEEP OPTIONAL, adapter-external | Phase 2 and Scope separate it from execution/preparation |
| query model / result typing | core | TypeScript contract shape | CLI producer and consuming application | REDUCE / colocate | not a cross-driver runtime behavior or a reason for a shared adapter package |

## Non-owners

None of these capabilities owns pool lifecycle, transaction behavior, logging,
masking, retry, business ordering, domain semantics, or test adequacy. Those
remain application responsibility.
