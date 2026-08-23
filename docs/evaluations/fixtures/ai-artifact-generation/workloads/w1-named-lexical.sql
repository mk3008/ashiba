select :account_id::bigint as account_id,
       :account_id::bigint as repeated,
       ':ignored' as literal,
       E'\\:ignored' as escape_literal,
       ':ignored' as ":ignored",
       $note$:ignored$note$ as dollar_literal
-- :ignored
/* outer :ignored /* nested :ignored */ still outer */
where :account_id::bigint = :account_id::bigint;
