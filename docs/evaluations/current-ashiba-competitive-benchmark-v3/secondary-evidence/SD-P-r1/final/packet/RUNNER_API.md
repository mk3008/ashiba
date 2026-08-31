# SD runner API

The selected candidate exports the unchanged primary G1 public API:

```ts
createApplication({ connectionString, schema }): {
  get({ id: string }): Promise<unknown>;
  list(input?: unknown): Promise<unknown>;
  close(): Promise<void>;
}
```

The runner accepts optional predeclared commands using `--typecheck-command`,
`--treatment-command`, and `--test-command`. They run inside the candidate
root with no admin database URL injected. Their stdout, stderr, exit status,
and duration are retained in the result. The runner then uses a candidate role
and nonce schema to call `get({id:'101'})` and `list({sort:'id',direction:'asc',offset:0,limit:10})`.

The runner emits one `SchemaDriftResult` per mutation containing source hashes,
all stage observations, final database state, pre-cleanup record, and cleanup
result. A mutation is not a source compatibility claim; it only establishes
detection latency under this exact candidate and operation subset.
