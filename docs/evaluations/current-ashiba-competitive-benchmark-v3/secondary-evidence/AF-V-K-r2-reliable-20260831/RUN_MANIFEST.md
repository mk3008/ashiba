# AF-V-K-r2 reliable initial materialization

This immutable snapshot predates every candidate action, verification command,
repair, and runner invocation. It was independently materialized at
`C:\tmp\ashiba-benchmark-v3-secondary\AF-V-K-r2-reliable-20260831`; the
external candidate source, its external evidence root, and the repository
evidence destination are disjoint.

## Materializer result

```json
{
  "cell": "AF-V-K-r2",
  "control": "AF-V",
  "arm": "K",
  "replicate": 2,
  "candidateRoot": "C:\\tmp\\ashiba-benchmark-v3-secondary\\AF-V-K-r2-reliable-20260831\\candidate",
  "packetRoot": "C:\\tmp\\ashiba-benchmark-v3-secondary\\AF-V-K-r2-reliable-20260831\\packet",
  "evidenceRoot": "C:\\tmp\\ashiba-benchmark-v3-secondary\\AF-V-K-r2-reliable-20260831\\evidence",
  "npmCache": "C:\\tmp\\ashiba-benchmark-v3-secondary\\AF-V-K-r2-reliable-20260831\\npm-cache",
  "installed": true
}
```

`npm ci --ignore-scripts` used the cell-local npm cache and installed 19
packages with zero reported vulnerabilities. The initial source snapshot
excludes `node_modules` and `dist`.

## Candidate source manifest

| Path | SHA-256 |
| --- | --- |
| package-lock.json | 7e75808f25529929668c2499b166eceec288c1e782e7036aa6f59da06a6d8da3 |
| package.json | 2989dfc6627118c332f6f2d47cf3ca18cac99651b79f525705f4218b76a96e20 |
| README.md | 95743bfcfdba436ebda420f6e7969cbacad5bab58cd42a11743a741812ecad22 |
| src/application.ts | bd95fd31c0b0b5da95b289d84129c942d073f84319838ec0866cd7b9f5b4f46c |
| src/platform/pool.ts | ef753d42ec988a2072463e3b126729706026214024cf59b67c3813dc51bb8e4a |
| src/platform/transaction.ts | 3295413b1481372d739bbc0c636ab665ffc22603d6d2e4317d960f3859b0eb34 |
| src/tickets/application/ticket-use-cases.ts | 4ae25cabc89153df617e8fe68f8b7e68fd52b173ae0b8914a7141549ed60da16 |
| src/tickets/dto.ts | 19eb7cc8d8aa9dfc545a56e27c47545a436aae351ad982cc40cd7866b08b6c64 |
| src/tickets/query/ticket-read-model.ts | 48303b161702398b6489f6aacddf92663860ed3b631b4185827ca0a54e9a94fe |
| src/tickets/sql/.gitkeep | 01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b |
| tests/tickets.integration.test.ts | 69b023b71955fc8257d91cfaec89707cbe744110bb7737191b0b88cefec5e0db |
| tsconfig.json | 0c9dc54045b6d1175cbaddfc4667ba7a2901f5cb609e4d4eea9a9f71181f6085 |

## Action status

No candidate action, repair, runner invocation, or oracle result occurred
before this snapshot.
