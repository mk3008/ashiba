SELECT o.id, o.status, o.created_at
FROM orders AS o
WHERE o.account_id = :accountId
  AND o.status = :status
/* @sort:search */
ORDER BY o.created_at DESC, o.id DESC
LIMIT :limit;
