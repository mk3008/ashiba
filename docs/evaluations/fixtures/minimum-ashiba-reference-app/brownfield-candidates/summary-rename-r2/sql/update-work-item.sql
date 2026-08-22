update work_items set summary = :summary::text, priority = :priority::text, version = version + 1 where id = :id::bigint returning id, summary, priority, version;
