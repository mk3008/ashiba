# Brownfield task: change business priority ordering

Modify the allocated copy of a small PostgreSQL work-item application. Change
the `priority` ascending business order to `normal`, then `urgent`, then every
other priority, retaining the documented stable `id ASC` tie-breaker. The
application must continue to allow only its documented finite ordering keys and
directions, with hostile ordering inputs rejected before SQL execution. Do not
construct SQL from input and do not edit outside your allocation.
