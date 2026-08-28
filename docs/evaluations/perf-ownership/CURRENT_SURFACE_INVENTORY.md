# Current Perf Surface Inventory

## Commands

| Command | Current behavior | DB execution? | Durable reason observed? |
|---|---|---:|---|
| `perf init` | Writes README, params JSON, and evidence directory. | no | Directory/README generation only. |
| `perf run` | Compares named parameters with JSON keys. | no | Overlaps binding/core checks. |
| `perf report diff` | Subtracts numeric duration fields. | no | Does not compare query, dataset, environment, or plan identity. |
| `perf scenario init` | Writes scenario JSON, dirs, and index-policy prose. | no | A small app document/script can do this. |
| `perf scenario measure` | Records caller-supplied duration and existing file path. | no | Does not verify measurement or plan provenance. |

`perf init` and `perf run` are registered but absent from the machine-readable catalog; only scenario init, scenario measure, and report diff are promoted.

## Maintenance inventory

| Surface | Current evidence |
|---|---|
| Implementation | `packages/cli/src/commands/perf.ts`, 631 LOC (reference only). |
| Registration | `packages/cli/src/index.ts`; catalog has three perf entries. |
| Public surface | Five operations with option/result interfaces. |
| Direct, registration, artifact, negative, and live tests | 0 perf-specific tests found. |
| Current docs promotion | Three catalog entries; no root README, guide, example, or dogfood promotion found. |
| Config | No current perf config key. `tests.performanceLane` was removed in Batch 3. |
| CI/root scripts | No perf-specific job or root script found. |
| Dependencies | No perf-specific dependency; reuses CLI and named-parameter compiler. |
| Current consumers | No repository consumer beyond CLI registration/catalog. |

## Artifact classes

- `perf/README.md`, `perf/params.json`, `perf/evidence/.gitkeep`
- `perf/scenarios/<name>/README.md`, `scenario.json`, `params.json`, and dirs
- measurement JSON with caller-supplied result, explain path, policy prose, and absolute `rootDir`
- loose report JSON consumed only through `durationMs` or `duration_ms`

These formats have no version, query hash, parameter identity, dataset/environment fingerprint, or plan identity. Retention creates format, docs, compatibility, and migration obligations without observed integrity protection.

## Repeated-use evidence

Implementation history has five source commits, but no repeated dogfood, CI, example, or user workflow was found using the format to prevent a concrete failure. This is repository evidence, not an external adoption census.
