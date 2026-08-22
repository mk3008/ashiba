# Brownfield task: add a three-state state filter

Modify the allocated copy of a small PostgreSQL work-item application. Add an
optional `state` filter to search. Its contract is: omitted means no predicate,
explicit null means `IS NULL`, and a value means a bound comparison. Preserve
the existing optional-filter behavior, complete named SQL assets, finite
application ordering capability, and visible transaction behavior. Do not
construct SQL from input and do not edit outside your allocation.
