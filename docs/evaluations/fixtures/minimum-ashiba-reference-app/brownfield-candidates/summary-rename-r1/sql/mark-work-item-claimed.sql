update work_items set state = 'claimed', assignee = :claimant::text, version = version + 1 where id = :id::bigint returning id, state, assignee;
