# Reproduction steps

This validates the committed preregistration plan only. It does not run a
candidate or modify the primary execution packet.

```powershell
$node = 'C:\tmp\ashiba-benchmark-v3-node24\node-v24.18.0-win-x64\node.exe'
& $node docs/evaluations/current-ashiba-competitive-benchmark-v3/fixtures/secondary-protocol/secondary-runner-api.mjs `
  --validate docs/evaluations/current-ashiba-competitive-benchmark-v3/fixtures/secondary-protocol/example-run-plan.json
```

Before executing a secondary control, create and commit an arm/control packet
that pins: the primary packet hash, this protocol directory hash, candidate
baseline manifest hash, entrypoint hash, package lock/digest, database image
digest, prompt and guidance hashes, runner implementation hash, and the
allocated evidence directory. Then use the `SecondaryRunInput` and
control-specific contracts in `RUNNER_API.md`. Start PostgreSQL using the same
documented primary benchmark procedure. Do not use an existing primary schema,
candidate directory, cache, or evidence directory.

