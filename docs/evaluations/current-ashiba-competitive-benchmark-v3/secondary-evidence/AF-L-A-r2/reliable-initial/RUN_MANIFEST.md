# AF-L-A-r2 reliable initial materialization

This preserved snapshot predates every candidate action.  It is a fresh
materialization at `C:\tmp\ashiba-benchmark-v3-secondary\AF-L-A-r2-reliable`;
the source and evidence destinations were checked to be disjoint before copy.

## Materializer result

```json
{
  "cell": "AF-L-A-r2",
  "control": "AF-L",
  "arm": "A",
  "replicate": 2,
  "candidateRoot": "C:\\tmp\\ashiba-benchmark-v3-secondary\\AF-L-A-r2-reliable\\candidate",
  "packetRoot": "C:\\tmp\\ashiba-benchmark-v3-secondary\\AF-L-A-r2-reliable\\packet",
  "evidenceRoot": "C:\\tmp\\ashiba-benchmark-v3-secondary\\AF-L-A-r2-reliable\\evidence",
  "npmCache": "C:\\tmp\\ashiba-benchmark-v3-secondary\\AF-L-A-r2-reliable\\npm-cache",
  "installed": true
}
```

`npm ci --ignore-scripts` installed 19 packages, audited 20 packages, and
reported zero vulnerabilities. The candidate source snapshot intentionally
excludes `node_modules` and `dist`.

## Candidate source manifest

| Path | SHA-256 |
| --- | --- |
| package-lock.json | f8a0db021915e5b35bf86ce5914ab91a421da10ec51239f39082ce72867ee9d3 |
| package.json | 998bfa48b3397799f8de66f2ccbeccf702f0e0d45a41b685d817a5c9494c1d51 |
| README.md | bc212ee12405c2fcf2f7f44833d8a34d7419ce1256569ab84d5569b613f1bb2f |
| src/application.ts | cae70d64ba64462888b326fd70eb1889423ec78416fd83239461dc4db5bbaf82 |
| src/application/ticket-service.ts | 008714b205816c1de4a4e5cc072d38d7afb1bf20c986c69cbd60084216364426 |
| src/contracts/ticket-dto.ts | 19eb7cc8d8aa9dfc545a56e27c47545a436aae351ad982cc40cd7866b08b6c64 |
| src/data-access/ticket-data-access.ts | e1b7d418296bcc67f8dd9d93eb75f4e1fbe4153d40bb1edae0f2fe71f2f8811a |
| src/platform/pool.ts | ef753d42ec988a2072463e3b126729706026214024cf59b67c3813dc51bb8e4a |
| src/platform/transaction.ts | 3295413b1481372d739bbc0c636ab665ffc22603d6d2e4317d960f3859b0eb34 |
| src/presentation/ticket-controller.ts | 90692bc33b9d6c3cdc7b9ae624015d5ad704f3105e9a2328dbc86a97a6296331 |
| tests/tickets.integration.test.ts | 69b023b71955fc8257d91cfaec89707cbe744110bb7737191b0b88cefec5e0db |
| tsconfig.json | 0c9dc54045b6d1175cb609e4d4eea9a9f71181f6085 |

The last hash above is recorded exactly as materialized in the source copy
manifest, whose full candidate source is preserved alongside this manifest.

## Action status

No candidate action, repair, runner invocation, or oracle result had occurred
when this snapshot was made.
