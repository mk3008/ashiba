// Application SQL snapshot. The canonical SQL file remains the source of truth.
export const querySql = "update public.tickets\nset\n    status = :status\n    , updated_at = :updated_at\n    , version_key = version_key + 1\nwhere\n    ticket_id = :ticket_id\n    and version_key = :expected_version_key\nreturning\n    ticket_id\n    , status\n    , updated_at\n    , version_key;\n" as const;
