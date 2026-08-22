update work_items set name = :name::text, priority = :priority::text, version = version + 1 where id = :id::bigint returning id, name, priority, version;
