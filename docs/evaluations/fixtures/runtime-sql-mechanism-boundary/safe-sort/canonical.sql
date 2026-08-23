select id, priority, created_at, name from runtime_boundary_items where status = :status::text /* ORDER_BY_INSERTION */ limit :limit::integer offset :offset::integer;
