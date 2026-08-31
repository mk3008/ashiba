# AF-V-S-r2 exact-packet fresh run manifest

- Cell: `AF-V-S-r2`; protocol: `secondary-controls-v1` / `af-controls-v1`.
- Fresh, disjoint root: `C:\tmp\ashiba-benchmark-v3-secondary\AF-V-S-r2-reliable-v013-20260831`.
- Candidate, packet, evidence and npm cache are all cell-private children of that root.
- Shared packet and runner are read-only inputs.
- `npm ci --ignore-scripts` completed in the candidate before its source was modified.
- The frozen packet fetcher completed before source modification:
  - sqlc 1.31.1 Windows ZIP: `352711fa7dcb05dcdfefca0ad71b2c9a74fd090f8d7fc609419de4cbc725429f`
  - sqlc-gen-typescript 0.1.3 WASM: `287df8f6cc06377d67ad5ba02c9e0f00c585509881434d15ea8bd9fc751a9368`

## Immutable pre-action preservation

The untouched candidate source is preserved under
`secondary-candidate-snapshots/AF-V-S-r2/reliable-v013-20260831/attempt-initial-preaction`.
The exact packet and verified tooling digest manifest are sibling durable evidence.
No candidate source, generation, typecheck, test, build, or oracle step happened
before that preservation.

## Scoring bounds

The initial attempt and no more than two separately preserved candidate repairs are
eligible. Every attempt source and output must be copied to this evidence tree
before another attempt or any cleanup. The previously materialized `0.1.2`
directory is a separately preserved excluded pre-execution setup incident, not a
candidate attempt.
