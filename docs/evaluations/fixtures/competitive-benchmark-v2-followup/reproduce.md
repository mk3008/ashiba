# Reproduction

The committed packet is the semantic SSOT. Runnable harness, per-cell source, and raw records are under `tmp/competitive-benchmark-v2-followup/`.

1. Start Docker PostgreSQL 18 on host port 5432.
2. From the repository root, run the harness only through:

   ```powershell
   tmp/competitive-benchmark-v2/run-in-pg18.ps1 -Command 'npx --yes --package node@24.19.0 node tmp/competitive-benchmark-v2-followup/run-reference-controls.mjs'
   ```

3. Confirm the T1, T2, and W5 reference controls report `P` before dispatching any Fresh-Agent cell.
4. Dispatch only the fixed treatment in [arm-treatment.md](./arm-treatment.md) and run the evaluator after the agent completes. Record raw outcomes under `tmp/competitive-benchmark-v2-followup/primary-runs/<ARM>-<WORKLOAD>-r<N>`.

The command, nonce schema, resolved versions, and evaluator record are saved per run. Large logs and worker transcripts are intentionally not committed.
