update tickets
set status = :status
where ticket_id = :ticket_id
returning ticket_id, status;
