# Transfer Process Maps

This directory contains process maps for `@ashiba-ts/transfer-dogfood`.

Process maps describe use-case flow, process order, and input/output relationships derived from the Concept Specs.
They are not Concept Specs and do not redefine concept meanings, responsibilities, non-responsibilities, or invariants.

Process Map Markdown is the human-readable logical design.
`process-map.json` is the machine-readable review index for process map IDs, views, related concepts, and purposes.
Human review indexes can be generated from that metadata; do not store process-map coverage facts only in a hand-maintained README or generated page.

Process maps are more detailed than DFDs.
DFDs may use DFD Concept Groups to keep coarse data-flow diagrams readable.
Process maps must not use DFD Concept Groups; they should use concrete Concepts in detail views.

## Process Map Rules

Transfer process maps are review views for transfer concepts.

- They must not redefine Concept Spec meanings, responsibilities, non-responsibilities, or invariants.
- They should describe process order, state transitions, and input/output relationships.
- They should stay above physical implementation details such as SQL text, API routes, transaction code, and UI behavior.
- They should use concrete transfer Concepts rather than DFD-only concept groups.
- When a process requires implementation evidence, link to DDL, SQL, or generated review artifacts instead of embedding implementation details in the process map.

Available process maps:

This list is a human entrypoint. Use `process-map.json` for completeness checks.
Read DFDs first for business boundaries, then process maps for the detailed process flow of each business operation.

- [Transfer Execution Process](./transfer-execution-process.md)
- [Lineage Trace Process](./lineage-trace-process.md)

Machine-readable process metadata:

- [Process Map Metadata](./process-map.json)
