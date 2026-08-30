# Dynamic composition

G1 measures finite reviewed sorting, optional filters, and pagination. The
runner rejects unknown sort vocabulary and verifies values remain separate
from SQL syntax. This is a bounded dynamic-SQL condition.

X1 separately tests a finite open-ended-report approximation where projection,
join, predicates, and grouping vary together. It is expressly non-aggregate:
its result must not be used to rank the primary G1/T1/T2/Q1 workloads.

**Observed.** H-007 reran all six arms as X1 r2 under the corrected
static-isolation classifier. The aggregate selects those six explicit terminal
runner documents: A, S, D, K, and G are recorded passing; P is recorded
failing because its candidate application entrypoint was absent. P received no
candidate repair after that first failure and was not substituted with native
pg. All six r2 static-isolation and runner cleanup records pass.

The pre-correction X1 r1 documents remain preserved as historical correction
context. They are not selected as terminal X1 interpretations. This is one
corrected replicate per arm under a non-aggregate control, not an arm ranking
or a general report-builder result. It cannot support an adoption claim for or
against any treatment's general open-ended-composition suitability.
