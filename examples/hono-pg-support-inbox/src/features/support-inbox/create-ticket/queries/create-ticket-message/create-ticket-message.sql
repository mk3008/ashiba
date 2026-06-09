insert into public.ticket_messages(
    ticket_id
    , sender_name
    , sender_role
    , body
    , created_at
)
values
    (:ticket_id, :sender_name, :sender_role, :body, :created_at)
returning
    message_id
    , ticket_id
    , sender_name
    , sender_role
    , body
    , created_at;
