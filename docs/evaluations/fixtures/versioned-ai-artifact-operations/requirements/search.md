# Search requirements

`status` is optional. When omitted, remove only the `AND o.status = :status`
predicate. Sorting is restricted to `newest` (`o.created_at DESC, o.id DESC`)
and `oldest` (`o.created_at ASC, o.id ASC`) at `@sort:search`.
