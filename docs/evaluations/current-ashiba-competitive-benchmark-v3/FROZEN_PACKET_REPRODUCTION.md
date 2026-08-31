# Frozen packet reproduction

The primary execution packet was frozen at
`7988e3bedb84ee918c928afa33a58dbbcf826a37`. The packet verifier hashes the
correction ledger as one of its protocol inputs. The publication branch keeps
that ledger append-only so later exclusions and harness corrections remain
durable evidence. Consequently, the final branch can legitimately contain
ledger bytes that differ from the frozen packet; its expected hashes must not
be regenerated to make a final-head invocation pass.

## Reproduction

From the repository root, run:

```text
node docs/evaluations/current-ashiba-competitive-benchmark-v3/verify-frozen-packet.mjs
```

The script creates a clearly named temporary detached worktree at the frozen
SHA, runs the historical verifier there as:

```text
node fixtures/packet/packet-hash.mjs
```

and removes that worktree after the check. Its JSON output includes the exact
freeze SHA, temporary path, verifier exit status/output, and cleanup status.
This wrapper is publication/reproduction tooling only; it does not alter the
packet, its expected hashes, or the correction ledger.

## Observed reproduction

Run date: 2026-08-31.

```json
{
  "status": "PASS",
  "freezeSha": "7988e3bedb84ee918c928afa33a58dbbcf826a37",
  "packetVerifier": {
    "status": 0,
    "command": "C:\\Program Files\\nodejs\\node.exe fixtures/packet/packet-hash.mjs",
    "stdout": "{\n  \"status\": \"PASS\",\n  \"protocol\": \"v2\",\n  \"files\": 72,\n  \"protocolInputs\": 17\n}\n"
  },
  "cleanup": {
    "attempted": true,
    "status": 0,
    "error": null
  }
}
```

The temporary path is intentionally omitted from the durable excerpt because
it is host-specific and is removed after the run. The full command output is
the authoritative run record for the local host; the frozen SHA and verifier
result are the portable reproduction identity.
