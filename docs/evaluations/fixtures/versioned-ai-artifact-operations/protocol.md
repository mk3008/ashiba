# Protocol

The test subject is versioned metadata, not a product implementation.

* O0: SQL is the only authored input; a deterministic script derives all
  fixture metadata into one global manifest.
* O1: SQL and requirements are human-authored; an agent updates a small,
  per-query committed artifact. A deterministic verifier and deterministic
  runtime use it without AI, network, or a prior worktree cache.
* O2: AI is invoked during a clean build. The fixture records this as an early
  rejection: without a committed artifact it cannot be an offline/reproducible
  build input, and the verifier fails closed.

G1 bind lowering remains `scripts/g1-lower.mjs`, a deterministic build step.
O1 does not version bind order or lowered SQL. The O1 artifact versions only a
source identity plus G3 optional segment and G4 sort anchor/key policy.

Fresh-agent tasks receive only a normal change request and this worktree. They
are not told to edit artifacts. The ordinary verification command reports any
stale asset; the ledger records how the agent resolves that feedback.
