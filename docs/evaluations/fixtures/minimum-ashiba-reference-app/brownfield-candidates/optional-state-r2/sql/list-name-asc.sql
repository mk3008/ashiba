select w.id, w.name, w.priority, w.created_at from work_items w where w.state <> 'done' order by w.name asc, w.id asc limit :limit::integer offset :offset::integer;
