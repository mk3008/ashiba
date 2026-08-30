# AF runner API and architecture delta

The candidate exports the frozen primary G1 API from its built ESM entrypoint:

```ts
createApplication(runtime): {
  list(input?), get(input), create(input), assign(input), close()
}
```

The complete signatures and behavioral semantics are copied from
`fixtures/COMMON_API.md` to the clean-room packet. The AF runner makes no
additional callable API visible to a candidate.

The runner invokes the primary `runBenchmark` function with `workloads: ['G1']`
and its normal static scan, nonce-schema role, independent PostgreSQL oracle,
pre-cleanup database state, and cleanup. The candidate never receives the
administrator URL or primary fixture source.

After the G1 invocation, the AF runner writes:

```ts
interface ArchitectureDelta {
  baselineHash: string;
  candidateHash: string;
  changedExistingFiles: string[];
  missingExistingFiles: string[];
  movedOrRenamedExistingFiles: string[];
  newFiles: string[];
  newGlobalFiles: string[];
  newConfigFiles: string[];
  newGeneratedDirectories: string[];
  changedPoolSeam: boolean;
  changedTransactionSeam: boolean;
  changedDtoSeam: boolean;
  changedTestSeam: boolean;
  featureLocalSql: 'yes' | 'no' | 'not-applicable';
  requiredGuarantees: string[];
}
```

`baselineHash` is the checked-in manifest hash. `candidateHash` covers all
candidate source files except dependency installation directories. A renamed
baseline file is only identified when the same baseline content hash appears
at a different candidate path; a modified/deleted baseline file is reported
separately rather than guessed to be a rename.

`newGlobalFiles` is a classification of new files outside the architecture's
predeclared feature-local roots (VSA `src/tickets/`; layered
`src/data-access/`, `src/application/`, and `src/presentation/`) that introduce
global/platform/schema/config ownership. It is an observation, not an error.
`requiredGuarantees` records the treatment's normal mechanical guarantee
claimed by the run packet; it does not infer a guarantee from file counts.
