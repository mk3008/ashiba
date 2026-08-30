# Secondary control protocol

This directory freezes the **non-primary** controls for Current Ashiba
Competitive Benchmark v3. It is deliberately separate from the primary packet:
changing these files must not change a primary-cell result. No candidate has
been run through this protocol at the time it was added.

The controls answer questions that the `G1`, `T1`, `T2`, and `Q1` matrix does
not aggregate:

| Control | Question | Result use |
| --- | --- | --- |
| `AF-V` | Can a tool be added locally to a frozen vertical-slice application? | Architecture-fitness result, not a productivity score |
| `AF-L` | Can the same work be added locally to a frozen layered application? | Architecture-fitness result, not a productivity score |
| `X1` | How does each treatment handle open-ended report composition? | Separate composition boundary control |
| `SD` | When does an unchanged application detect a database-only drift? | Detection-authority observation |
| `E1` | What changes are needed to remove a selected treatment while retaining behaviour? | Coupling observation |

Read `PREREGISTRATION.md` before materialising a cell and `RUNNER_API.md`
before implementing a runner. `secondary-runner-api.mjs` validates the frozen
run-plan shape; it is intentionally not a substitute for a live oracle.

## Non-interference rule

Primary packet files, primary runner code, primary candidate directories, and
primary evidence are read-only inputs. A secondary control gets its own
candidate, evidence directory, npm cache, nonce schema, role, and cleanup.
The primary runner may be called as a library only for its existing G1 oracle;
the secondary runner must not alter it.

