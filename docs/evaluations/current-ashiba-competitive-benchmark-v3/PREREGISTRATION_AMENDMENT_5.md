# Preregistration amendment 5: canonical protocol-input verifier

## Status at correction

Primary scored-cell count remains **0**. This is a pre-scoring protocol
clarification; amendments 1–4 remain intact.

## Correction

Amendment 4 completed the runner and evidence-controller P0 work. This
amendment records the final verifier hardening needed for the execution packet:
the verifier now has a canonical logical-path namespace, includes its own
source, all prior preregistration/amendment documents, execution profile,
treatments, workloads, evaluator specification, manifest, and correction ledger
in its required input list, and rejects an expected manifest that omits any of
those inputs. `EXPECTED_HASHES_V2.json` is intentionally not self-hashed;
recursive self-hashing has no stable representation, so the committed freeze
SHA remains its integrity boundary.

## Binding freeze

The commit that first contains this amendment together with a passing protocol
v2 verifier is the sole `executionPacketFreezeSha` for scored primary cells.
No protocol input may change after that commit. A subsequent change requires a
new correction/amendment and invalidates every affected scored cell under the
preregistered correction rule.
