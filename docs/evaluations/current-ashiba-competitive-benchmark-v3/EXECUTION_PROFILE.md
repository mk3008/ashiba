# Scored execution profile

This file fixes the profile for every primary scored cell before any candidate
is dispatched. It supplements the original preregistration and its two
amendments; it does not replace them.

| Field | Frozen value |
| --- | --- |
| Agent model | `gpt-5.6-terra` |
| Reasoning effort | `high` |
| Candidate session | one new, no-history worker session per arm/workload/replicate cell |
| Candidate repair context | the same session receives its own bounded feedback only |
| Candidate write location | one fresh, cell-specific directory outside the Ashiba worktree |
| Shell / permissions | Windows PowerShell; workspace-write candidate directory; network enabled only for the arm's declared published artifact and frozen official documentation packet |
| Timebox | 90 minutes from receipt of the complete packet, including at most two candidate repairs |
| Runtime | Node 24.18.0 and PostgreSQL 18.6 |
| Candidate database identity | runner-owned nonce schema and the cell's supplied PostgreSQL URL only |
| Telemetry | record only tool-supplied values; token and credit telemetry are `unavailable` when absent |

The desktop execution environment does not expose a separately auditable model
build fingerprint. Each attempt therefore records `modelBuild: unavailable`.
The profile fixes the configured model alias and effort, not an unverifiable
underlying model build.

## Candidate isolation procedure

The coordinator creates each candidate directory from the frozen packet and
passes the worker only that directory, its own prompt, and its own run
identifier. Candidate instructions prohibit reading the Ashiba worktree, Git
history, other candidate directories, and prior evidence. The runner rejects
workspace/package links in the installed dependency graph. This is an
instructional and artifact-isolation control; it does not claim a stronger
operating-system sandbox than the available execution environment provides.

## Execution order

The deterministic execution order is stored in
`fixtures/packet/execution-order.json` with seed `ashiba-v3-primary-20260830`.
No result is recorded before the corresponding packet entry, reference control,
and negative controls have passed.
