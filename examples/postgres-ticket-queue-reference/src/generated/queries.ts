// Generated from canonical .sql by Ashiba. Do not edit.
export const queries = {
  "list": {
    "style": "indexed",
    "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets t\nwhere (cast($1 as text) is null or t.status = $1)\n  and (cast($2 as bigint) is null or t.customer_id = $2)\n  and (cast($3 as text) = 'any' or ($3 = 'unassigned' and t.assignee_id is null) or ($3 = 'assigned' and t.assignee_id = cast($4 as bigint)))\norder by t.id asc\nlimit cast($5 as integer) offset cast($6 as integer);\n",
    "parameterNames": [
      "status",
      "customerId",
      "assigneeMode",
      "assigneeId",
      "limit",
      "offset"
    ]
  },
  "get": {
    "style": "indexed",
    "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at from tickets where id = $1;\n",
    "parameterNames": [
      "id"
    ]
  },
  "assign": {
    "style": "indexed",
    "sql": "update tickets set assignee_id = $1, updated_at = now() where id = $2 returning id, customer_id, subject, status, priority, assignee_id, created_at, updated_at;\n",
    "parameterNames": [
      "assigneeId",
      "ticketId"
    ]
  },
  "audit": {
    "style": "indexed",
    "sql": "insert into ticket_events (ticket_id, event_type, actor_id, note) values ($1, 'assigned', $2, $3);\n",
    "parameterNames": [
      "ticketId",
      "actorId",
      "note"
    ]
  }
} as const;
