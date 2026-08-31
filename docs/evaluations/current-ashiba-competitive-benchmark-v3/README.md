# Current Ashiba Competitive Benchmark v3

This directory is a durable, external-reviewable benchmark record. It compares
bounded TypeScript/PostgreSQL data-access work under a frozen harness. It does
not claim an overall winner and does not change the Ashiba product.

The [preregistration](./PREREGISTRATION.md) is committed before any scored
candidate execution. Reproduction, inputs, candidate source snapshots, runner
outputs, calibration runs, and corrections are retained here rather than in an
ignored temporary directory.

Results distinguish observations from inferences and hypotheses. A passing
candidate behaviour test does not by itself establish treatment fidelity, and a
tool-specific workflow is not treated as an application-architecture mandate.

## Reading the two strategic documents

[AI-first strategic interpretation](./AI_FIRST_STRATEGIC_INTERPRETATION.md)
is an evidence-constrained analysis of the measured current 0.1.0 mechanism.
It does not change the current Scope. [Post-benchmark product
interpretation](./POST_BENCHMARK_PRODUCT_INTERPRETATION.md) is a human
post-benchmark hypothesis about a possible Rules / A0 / A1 / A2 follow-up; it
is not current normative product guidance or a benchmark rescore.

The two documents deliberately differ in status. In particular, the current
Scope retains strict missing and unused parameter rejection. The post-benchmark
document asks whether unused-value strictness deserves a focused maturity
experiment; it does not alter that current contract.
