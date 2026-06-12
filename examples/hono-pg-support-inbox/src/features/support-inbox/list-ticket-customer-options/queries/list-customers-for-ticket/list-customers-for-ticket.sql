select
    customer_id
    , name
    , tier
    , locale
    , created_at
from
    public.customers
order by
    customer_id
limit
    :limit;
