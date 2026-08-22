# Reproduction

The committed packet replays the **reference controls only**. It does not
recreate the nondeterministic Fresh-Agent executions or recover missing
historical W5 starting source.

From a fresh clone, with Docker and PowerShell 7 available:

```powershell
docker compose -f docs/evaluations/fixtures/competitive-benchmark-v2-followup/docker-compose.pg18.yml up -d
Push-Location docs/evaluations/fixtures/competitive-benchmark-v2-followup
npm ci
Pop-Location
pwsh -NoProfile -File docs/evaluations/fixtures/competitive-benchmark-v2-followup/scripts/run-in-pg18.ps1 -Command 'npx --yes --package node@24.19.0 node docs/evaluations/fixtures/competitive-benchmark-v2-followup/reference/run-reference-controls.mjs'
```

The command creates a distinct database, role, and nonce schema, runs T1, T2,
and W5 with PostgreSQL 18 and Node 24.19.0, writes a replay record to
`tmp/competitive-benchmark-v2-followup-reference-replay.json`, and drops the
database and role. A `P` summary with cleanup `pass` proves the committed
fixture, reference implementation, and runner-owned oracle are mutually
executable. It does **not** re-evaluate the 30 submitted candidate boundaries.

For isolated controls, substitute `evaluator/T1-T2/reference-evaluator.mjs` or
`evaluator/W5/reference-evaluator.mjs` in the final command. The historical
candidate outcome summaries are durable evidence, while large logs, transcripts,
and candidate working trees intentionally remain `tmp`-only.
