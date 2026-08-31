# Frozen layered baseline

This is a runner-owned ordinary TypeScript layered application boundary. The
candidate receives a copy of the source tree but not the trusted hash manifest.
It may implement the G1 feature inside the supplied presentation, application
and data-access layers.

Pool, transaction, DTO and test seams belong to the application. The baseline
does not prescribe a repository/unit-of-work framework or a schema DSL.
