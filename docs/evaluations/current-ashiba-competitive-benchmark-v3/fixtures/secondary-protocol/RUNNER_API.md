# Secondary runner API and evidence contract

The secondary runner is runner-owned. It provisions PostgreSQL through the
same nonce-schema/least-privilege fixture lifecycle as the primary runner, and
it imports a built candidate without modifying its source. Every operation
writes a pre-cleanup DB-state record before dropping its schema and role.

## Common inputs

```ts
export interface SecondaryRunInput {
  control: 'AF-V' | 'AF-L' | 'X1' | 'SD' | 'E1';
  arm: 'A' | 'P' | 'S' | 'D' | 'K' | 'G';
  replicate: number;
  candidateEntry: string;
  candidateRoot: string;
  baselineManifest?: string;
  output: string;
}
```

The runner verifies a no-link/no-workspace-leak static scan before connecting
the candidate. Candidate source cannot refer to `public`, runner admin
credentials, failure-injection tables, or a prior candidate directory. It
records packet hashes, source hashes before and after execution, command logs,
candidate manifest, runner events, treatment review, DB state, and cleanup.

## AF-V / AF-L contract

`AF-V` and `AF-L` reuse `createApplication(runtime)` and the existing G1
operation contract. The secondary runner invokes the immutable primary runner
for G1, then computes a path/hash manifest diff against the runner-owned
baseline skeleton.

```ts
export interface ArchitectureDelta {
  baselineHash: string;
  candidateHash: string;
  movedOrRenamedExistingFiles: string[];
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

The runner emits `architectureDelta` as an observation. No arbitrary maximum
file count is a pass/fail criterion. The pass condition is: baseline integrity
holds, the G1 oracle passes, and the delta report is complete.

## X1 contract

```ts
export interface ReportRequest {
  dimensions: ReadonlyArray<'status' | 'assignee' | 'tag'>;
  metric: 'count' | 'priorityTotal';
  includeTagJoin: boolean;
  statuses?: ReadonlyArray<'open' | 'pending' | 'closed'>;
  requestedTag?: string;
}

export interface ReportResult {
  rows: ReadonlyArray<Record<string, string | number | null>>;
  sourceSql: string;
  executedSql: string;
  params: ReadonlyArray<unknown>;
}

export interface ReportApplication {
  runReport(input: ReportRequest): Promise<ReportResult>;
  close(): Promise<void>;
}

export function createReportApplication(runtime: {
  connectionString: string;
  schema: string;
}): ReportApplication | Promise<ReportApplication>;
```

The runner uses at least these requests: (a) status count without a tag join,
(b) status/assignee priority total constrained to `open,pending`, and (c)
tag/status count constrained to a hostile SQL-looking tag value. It validates
dimensions, metric, and statuses against the finite vocabulary; unknown values
must reject with `code: 'VALIDATION'`. Runner oracle queries are independently
parameterized. It requires that `sourceSql` and `executedSql` are non-empty,
do not target `public`, and correspond to the candidate-reported parameters;
it does not require a particular query-builder representation.

## SD contract

The candidate public API is the G1 API. For every individual mutation, the
runner writes `baseline-source-manifest.json`, executes baseline commands and
G1, applies one DDL mutation under the admin role, then reruns exactly the
predeclared candidate commands and targeted G1 operation. It produces:

```ts
export interface SchemaDriftResult {
  mutation: 'column-rename' | 'nullability-tighten' | 'integer-to-bigint';
  sourceHashBefore: string;
  sourceHashAfter: string;
  firstDetectionStage:
    | 'typecheck'
    | 'treatment-command'
    | 'candidate-test'
    | 'application-execution'
    | 'runner-oracle'
    | 'not-detected-in-measured-stages';
  observations: Array<{ stage: string; status: 'pass' | 'fail' | 'not-run'; detail: string }>;
}
```

`sourceHashBefore !== sourceHashAfter` is a protocol failure, not schema-drift
evidence. SD is observation-only and never causes a primary cell to be rerun.

## E1 contract

The exit candidate also implements the G1 API. The runner verifies the copied
baseline source hash, the expected removed dependency/tool state, no forbidden
treatment import/command, and a final primary G1 oracle result. It records
the file and artifact diff; it does not add a freshness artifact merely to
measure removal.

