// Generated from canonical .sql by Ashiba. Do not edit.
export const queries = {
  "list": {
    "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets t\nwhere (cast($1 as text) is null or t.status = $2)\n  and (cast($3 as bigint) is null or t.customer_id = $4)\n  and (cast($5 as text) = 'any' or ($6 = 'unassigned' and t.assignee_id is null) or ($7 = 'assigned' and t.assignee_id = cast($8 as bigint)))\norder by t.id asc\nlimit cast($9 as integer) offset cast($10 as integer);\n",
    "orderedNames": [
      "status",
      "status",
      "customerId",
      "customerId",
      "assigneeMode",
      "assigneeMode",
      "assigneeMode",
      "assigneeId",
      "limit",
      "offset"
    ]
  },
  "get": {
    "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at from tickets where id = $1;\n",
    "orderedNames": [
      "id"
    ]
  },
  "assign": {
    "sql": "update tickets set assignee_id = $1, updated_at = now() where id = $2 returning id, customer_id, subject, status, priority, assignee_id, created_at, updated_at;\n",
    "orderedNames": [
      "assigneeId",
      "ticketId"
    ]
  },
  "audit": {
    "sql": "insert into ticket_events (ticket_id, event_type, actor_id, note) values ($1, 'assigned', $2, $3);\n",
    "orderedNames": [
      "ticketId",
      "actorId",
      "note"
    ]
  }
} as const;
