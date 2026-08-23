# Current driver boundary inventory

Development-time `model-gen` invokes `compileNamedParameters`, writes dialect
SQL and `orderedNames`, records `sourceHash`, and converts source coordinates
for Safe Sort and optional-condition metadata. Runtime
`compilePostgresQuery` validates hashes, maps names to values, applies optional
coordinate edits/renumbering only when requested, and optionally splices a
reviewed sort expression at generated coordinates.

The adapter wrapper also owns pg-call normalization, parameter validation,
observability/masking, driver representation profile checks, and retry error
classification. These are separate responsibilities from named binding.
