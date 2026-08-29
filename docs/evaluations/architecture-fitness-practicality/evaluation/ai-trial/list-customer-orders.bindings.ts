// Evaluation-only generated shape; a real application would use `ashiba model-gen`.
// Regenerate from the canonical SQL whenever it changes.

export const bindingMetadata = {
  sourceHash: 'sha256:800f171658ec2c88a49f28935c3e105ce2391c34b13aa484469c0813587a917d',
  bindings: {
    postgres: {
      style: 'indexed',
      sql: `select
    o.order_id
    , o.created_at
    , c.display_name as customer_name
    , o.status
    , o.total_cents
from
    orders as o
    join customers as c on c.customer_id = o.customer_id
where
    o.store_id = $1
    and ($2 is null or o.status = $2)
    and o.created_at >= $3
order by
    o.created_at desc
    , o.order_id desc
limit $4;`,
      parameterNames: ['store_id', 'status', 'created_after', 'limit'],
    },
  },
} as const;
