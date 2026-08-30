# AF-V-S-r2 reliable fresh run manifest

- Cell: `AF-V-S-r2`
- Control / arm / replicate: `AF-V` / `S` / `2`
- Protocol: `secondary-controls-v1`, `af-controls-v1`
- Fresh candidate root: `C:\tmp\ashiba-benchmark-v3-secondary\AF-V-S-r2-reliable-20260831\candidate`
- Fresh evidence root: `C:\tmp\ashiba-benchmark-v3-secondary\AF-V-S-r2-reliable-20260831\evidence`
- Private cache: `C:\tmp\ashiba-benchmark-v3-secondary\AF-V-S-r2-reliable-20260831\npm-cache`
- Candidate materialized and dependencies installed: 2026-08-31T00:00:00Z (the materializer output is preserved with this run).
- Shared runner and frozen packet: read-only repository inputs.
- External destination is disjoint from every other candidate cell directory.

## Immutable pre-action source manifest

Captured before candidate source was changed and before any attempt/repair command.

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| package-lock.json | 7321 | ad0924d2fae3d4931a5fc7b5961edd4e010317bb8f5ef8410acb801b5550e55e |
| package.json | 190 | 467ff0587ea0ab0966151b6cd9f5aa2675e4c903d87dd470e20bb37d52e0a8d8 |
| README.md | 455 | 95743bfcfdba436ebda420f6e7969cbacad5bab58cd42a11743a741812ecad22 |
| src/application.ts | 265 | bd95fd31c0b0b5da95b289d84129c942d073f84319838ec0866cd7b9f5b4f46c |
| src/platform/pool.ts | 186 | ef753d42ec988a2072463e3b126729706026214024cf59b67c3813dc51bb8e4a |
| src/platform/transaction.ts | 200 | 3295413b1481372d739bbc0c636ab665ffc22603d6d2e4317d960f3859b0eb34 |
| src/tickets/application/ticket-use-cases.ts | 138 | 4ae25cabc89153df617e8fe68f8b7e68fd52b173ae0b8914a7141549ed60da16 |
| src/tickets/dto.ts | 298 | 19eb7cc8d8aa9dfc545a56e27c47545a436aae351ad982cc40cd7866b08b6c64 |
| src/tickets/query/ticket-read-model.ts | 138 | 48303b161702398b6489f6aacddf92663860ed3b631b4185827ca0a54e9a94fe |
| src/tickets/sql/.gitkeep | 1 | 01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b |
| tests/tickets.integration.test.ts | 143 | 69b023b71955fc8257d91cfaec89707cbe744110bb7737191b0b88cefec5e0db |
| tsconfig.json | 262 | 0c9dc54045b6d1175cbaddfc4667ba7a2901f5cb609e4d4eea9a9f71181f6085 |

## Attempt policy

The scorer permits one initial implementation and at most two separately preserved
candidate repairs. Candidate source, logs, runner output, architecture delta, and
runner-owned cleanup records are copied into this repository evidence directory
before the external clean room is eligible for removal.

## Excluded setup incident

Before any `sqlc generate`, typecheck, candidate test, build, or runner action,
the environment setup selected the TypeScript plugin version shown in the generic
official-doc snapshot (`0.1.2`). The frozen execution packet requires `0.1.3`.
The candidate source with configuration and SQL drafted during that setup is
preserved as `excluded-plugin-0.1.2-pre-execution`; the downloaded tooling digest
is preserved separately. This directory is **not a scored attempt** and has no
runner result. A fresh, disjoint clean room will be materialized with the exact
packet plugin before the initial scored attempt.
