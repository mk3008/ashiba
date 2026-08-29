# Finite Sort Safety Model

The relevant boundary is not "string concatenation". It is the provenance of
the SQL syntax that reaches the native driver.

```text
unsafe: external string -> SQL syntax
safe candidate: validated finite key + validated direction
                -> reviewed source-controlled SQL term -> SQL syntax
```

Named binding remains the owner of data values. It must not be repurposed to
bind SQL identifiers or ordering syntax.

The isolated control in `evaluation/sort/reviewed-finite-composition.mjs`
passes known single and multi-sort inputs and rejects unknown/hostile keys,
invalid direction, duplicate keys, and more than three terms. Every accepted
result ends with a reviewed stable tie-breaker. No external input is copied
into SQL syntax.

This control proves the bounded safety property only. It does not prove a
business ordering is correct, that every desired sort is exposed, or that a
new term was reviewed. Those remain application review and test duties.
