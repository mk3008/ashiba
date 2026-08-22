select id, name from work_items where state = 'ready' order by created_at asc, id asc for update skip locked limit 1;
