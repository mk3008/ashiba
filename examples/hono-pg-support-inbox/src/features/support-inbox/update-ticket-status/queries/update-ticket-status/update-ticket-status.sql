update public.tickets
set
    status = :status
    , updated_at = :updated_at
    , version_key = version_key + 1
where
    ticket_id = :ticket_id
    and version_key = :expected_version_key
returning
    ticket_id
    , status
    , updated_at
    , version_key;
