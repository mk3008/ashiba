-- name: Investigate :many
WITH ranked_orders AS (
  SELECT
    c.customer_id,
    c.display_name,
    c.region,
    c.tags @> ARRAY[$1::text]::text[] AS has_requested_tag,
    o.order_id,
    o.total_cents::bigint AS total_cents,
    ROW_NUMBER() OVER (
      PARTITION BY c.customer_id
      ORDER BY o.created_at DESC, o.order_id DESC
    ) AS order_rank
  FROM customers AS c
  LEFT JOIN orders AS o
    ON o.customer_id = c.customer_id
   AND o.state = 'paid'::order_state
  WHERE c.profile->>'tier' = $2::text
), summary AS (
  SELECT
    customer_id,
    display_name,
    region,
    has_requested_tag,
    COUNT(order_id)::bigint AS paid_order_count,
    COALESCE(SUM(total_cents), 0)::bigint AS paid_total_cents,
    MAX(total_cents) FILTER (WHERE order_rank = 1)::bigint AS latest_order_cents
  FROM ranked_orders
  GROUP BY customer_id, display_name, region, has_requested_tag
)
SELECT
  customer_id::text AS customer_id,
  display_name,
  region,
  has_requested_tag,
  paid_order_count::text AS paid_order_count,
  paid_total_cents::text AS paid_total_cents,
  latest_order_cents::text AS latest_order_cents,
  CASE
    WHEN paid_total_cents >= 5000 THEN 'high'
    WHEN paid_total_cents > 0 THEN 'normal'
    ELSE 'none'
  END AS value_band
FROM summary
ORDER BY paid_total_cents DESC, customer_id ASC;
