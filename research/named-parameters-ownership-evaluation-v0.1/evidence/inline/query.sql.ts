export const sql = `select :tenantId::uuid, :tenantId::uuid, ':not' as literal, "id:name" from items -- :comment
where status = :status /* :comment */ and title <> :hostileValue`;
