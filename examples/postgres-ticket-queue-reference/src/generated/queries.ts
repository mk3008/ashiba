// Generated from canonical .sql by Ashiba. Do not edit.
export const queries = {
  "list": {
    "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets t\nwhere (cast(:status as text) is null or t.status = :status)\n  and (cast(:customerId as bigint) is null or t.customer_id = :customerId)\n  and (cast(:assigneeMode as text) = 'any' or (:assigneeMode = 'unassigned' and t.assignee_id is null) or (:assigneeMode = 'assigned' and t.assignee_id = cast(:assigneeId as bigint)))\norder by t.id asc\nlimit cast(:limit as integer) offset cast(:offset as integer);\n",
    "sourceHash": "sha256:f59608eaad4b958545a99b9093b1a67d1aaaac0c57649fe101ca772a73621392",
    "postgres": {
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
    }
  },
  "get": {
    "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at from tickets where id = :id;\n",
    "sourceHash": "sha256:a1ad0fc431ec569b1a87cde09543eeb39907956967edd64a1dd3b397c3387ef6",
    "postgres": {
      "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at from tickets where id = $1;\n",
      "orderedNames": [
        "id"
      ]
    }
  },
  "assign": {
    "sql": "update tickets set assignee_id = :assigneeId, updated_at = now() where id = :ticketId returning id, customer_id, subject, status, priority, assignee_id, created_at, updated_at;\n",
    "sourceHash": "sha256:fc0c4db1a68baf20eac4d6e5681645003531f1c01bc04c59355e000d1bb71b96",
    "postgres": {
      "sql": "update tickets set assignee_id = $1, updated_at = now() where id = $2 returning id, customer_id, subject, status, priority, assignee_id, created_at, updated_at;\n",
      "orderedNames": [
        "assigneeId",
        "ticketId"
      ]
    }
  },
  "audit": {
    "sql": "insert into ticket_events (ticket_id, event_type, actor_id, note) values (:ticketId, 'assigned', :actorId, :note);\n",
    "sourceHash": "sha256:720b8aa7f8e73c6bf68e0c300f57885cbe76f8a37361890cd72e01d8b4bd812b",
    "postgres": {
      "sql": "insert into ticket_events (ticket_id, event_type, actor_id, note) values ($1, 'assigned', $2, $3);\n",
      "orderedNames": [
        "ticketId",
        "actorId",
        "note"
      ]
    }
  }
} as const;
