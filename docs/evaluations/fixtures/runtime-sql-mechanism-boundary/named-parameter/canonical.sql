select
  :id::bigint as id,
  :id2::bigint as id2,
  :id::bigint as repeated_id,
  value::text as cast_value,
  ':not_a_parameter'::text as literal,
  value as "identifier:still_not_parameter",
  E'escaped \\ :not_a_parameter'::text as escaped_literal,
  $$ :not_a_parameter $$::text as dollar_literal,
  $body$
    :not_a_parameter
  $body$::text as tagged_dollar_literal
from (select :value::text as value) source
-- :not_a_parameter
/* :not_a_parameter */
/* outer /* nested :not_parameter */ outer again */
where :id::bigint = :id::bigint;
