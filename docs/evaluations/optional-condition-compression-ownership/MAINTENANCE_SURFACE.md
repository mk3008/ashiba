# Maintenance Surface

Keeping the capability permanently would require Ashiba to own:

* a PostgreSQL-specific runtime rewriter and coordinate/renumbering behavior;
* source hash and source/lowered coordinate schema compatibility;
* public preparation options, query-model types, errors, and package exports;
* three CLI authoring/refresh commands and command catalog/help;
* generated artifact format and refresh documentation;
* parser support and SQL-shape edge cases, including nested scopes and boolean
  glue;
* tests for stale text/ranges, all-branch removal, placeholder renumbering, and
  interactions with unrelated transformations; and
* breaking-change and migration obligations across current generated sources.

The current implementation also mixes this capability with the already reduced
ordinary preparation and safe-sort surfaces. A hypothetical small package would
reduce accidental coupling but would not eliminate the coordinate contract,
PostgreSQL dialect dependency, artifact schema, and compatibility burden.

The unique early proof does not outweigh this permanent ownership burden with
the observed single dogfood family, no independent runtime-outcome advantage,
and simple valid ordinary SQL alternative.
