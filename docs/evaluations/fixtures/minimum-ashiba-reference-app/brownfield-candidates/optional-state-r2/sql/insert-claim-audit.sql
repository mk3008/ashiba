insert into claim_audit (work_item_id, claimant, context) values (:work_item_id::bigint, :claimant::text, :context::jsonb) returning id, work_item_id, claimant, context;
