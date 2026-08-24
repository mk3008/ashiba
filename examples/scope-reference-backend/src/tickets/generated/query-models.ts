// Generated from canonical SQL by Ashiba model-gen. Do not edit by hand.
// Run `pnpm generate:sql-artifacts` after changing canonical SQL.

export const queryModels = {
  "list": {
    "analysis": {
      "astParse": "ok",
      "statementKind": "select",
      "rootQueryShape": "simple-select",
      "hasTopLevelOrderBy": true,
      "sourceHash": "sha256:1d30943026b3c464810187dd3097f95a0adbc9026c0123534f2364ef77f011c9",
      "safeSort": {
        "insertion": {
          "status": "ready",
          "index": 438,
          "end": 447,
          "mode": "replace"
        },
        "sortable": {
          "id": {
            "sql": "t.id",
            "defaultDirection": "asc",
            "allowedDirections": [
              "asc"
            ]
          }
        }
      },
      "optionalConditionCompression": {
        "enabled": true,
        "branches": [
          {
            "parameterName": "status",
            "kind": "expression",
            "sourceRange": {
              "start": 108,
              "end": 161,
              "text": "(cast(:status as text) is null or t.status = :status)"
            },
            "removalRange": {
              "start": 108,
              "end": 168,
              "text": "(cast(:status as text) is null or t.status = :status)\n  and "
            },
            "openParenIndex": 20,
            "closeParenIndex": 35,
            "presentReplacement": {
              "start": 108,
              "end": 161,
              "text": "t.status = :status"
            }
          },
          {
            "parameterName": "customerId",
            "kind": "expression",
            "sourceRange": {
              "start": 168,
              "end": 236,
              "text": "(cast(:customerId as bigint) is null or t.customer_id = :customerId)"
            },
            "removalRange": {
              "start": 164,
              "end": 236,
              "text": "and (cast(:customerId as bigint) is null or t.customer_id = :customerId)"
            },
            "openParenIndex": 37,
            "closeParenIndex": 52,
            "presentReplacement": {
              "start": 168,
              "end": 236,
              "text": "t.customer_id = :customerId"
            }
          }
        ],
        "groups": [
          {
            "branchIndexes": [
              0,
              1
            ],
            "removalRange": {
              "start": 108,
              "end": 243,
              "text": "(cast(:status as text) is null or t.status = :status)\n  and (cast(:customerId as bigint) is null or t.customer_id = :customerId)\n  and "
            },
            "leadingPrefixes": [
              {
                "branchIndexes": [
                  0
                ],
                "removalRange": {
                  "start": 108,
                  "end": 168,
                  "text": "(cast(:status as text) is null or t.status = :status)\n  and "
                }
              }
            ]
          }
        ]
      },
      "resultColumns": [
        "assignee_id",
        "created_at",
        "customer_id",
        "id",
        "priority",
        "status",
        "subject",
        "updated_at"
      ],
      "resultColumnOrder": [
        "id",
        "customer_id",
        "subject",
        "status",
        "priority",
        "assignee_id",
        "created_at",
        "updated_at"
      ],
      "resultColumnTypes": {
        "assignee_id": "unknown",
        "created_at": "unknown",
        "customer_id": "unknown",
        "id": "unknown",
        "priority": "unknown",
        "status": "unknown",
        "subject": "unknown",
        "updated_at": "unknown"
      },
      "resultColumnNullability": {
        "assignee_id": "unknown",
        "created_at": "unknown",
        "customer_id": "unknown",
        "id": "unknown",
        "priority": "unknown",
        "status": "unknown",
        "subject": "unknown",
        "updated_at": "unknown"
      },
      "namedParameters": [
        "status",
        "customerId",
        "assigneeMode",
        "assigneeId",
        "limit",
        "offset"
      ],
      "parserCapabilities": {
        "parser": {
          "status": "supported"
        },
        "sqlStorage": "unaffected",
        "execution": "unaffected",
        "parameterBinding": "unaffected",
        "logging": "unaffected",
        "resultContract": "supported",
        "optionalConditionCompression": "supported",
        "safeSort": "supported",
        "impactAnalysis": "supported"
      },
      "parameterTypes": {
        "assigneeId": "string",
        "assigneeMode": "string",
        "customerId": "string | null",
        "limit": "number",
        "offset": "number",
        "status": "string | null"
      }
    },
    "bindings": {
      "postgres": {
        "sourceHash": "sha256:1d30943026b3c464810187dd3097f95a0adbc9026c0123534f2364ef77f011c9",
        "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets t\nwhere (cast($1 as text) is null or t.status = $2)\n  and (cast($3 as bigint) is null or t.customer_id = $4)\n  and (cast($5 as text) = 'any'\n    or ($6 = 'unassigned' and t.assignee_id is null)\n    or ($7 = 'assigned' and t.assignee_id = cast($8 as bigint)))\norder by t.id asc\nlimit cast($9 as integer) offset cast($10 as integer);\n",
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
        ],
        "safeSortInsertion": {
          "index": 368,
          "end": 377
        },
        "optionalConditionCompression": {
          "branches": [
            {
              "parameterName": "status",
              "removalRange": {
                "start": 108,
                "end": 158
              },
              "presentReplacement": {
                "start": 108,
                "end": 151,
                "text": "t.status = $1"
              }
            },
            {
              "parameterName": "customerId",
              "removalRange": {
                "start": 154,
                "end": 208
              },
              "presentReplacement": {
                "start": 158,
                "end": 208,
                "text": "t.customer_id = $3"
              }
            }
          ],
          "groups": [
            {
              "branchIndexes": [
                0,
                1
              ],
              "removalRange": {
                "start": 108,
                "end": 215,
                "text": "(cast($1 as text) is null or t.status = $2)\n  and (cast($3 as bigint) is null or t.customer_id = $4)\n  and "
              },
              "leadingPrefixes": [
                {
                  "branchIndexes": [
                    0
                  ],
                  "removalRange": {
                    "start": 108,
                    "end": 158,
                    "text": "(cast($1 as text) is null or t.status = $2)\n  and "
                  }
                }
              ]
            }
          ]
        }
      },
      "mysql2": {
        "sourceHash": "sha256:1d30943026b3c464810187dd3097f95a0adbc9026c0123534f2364ef77f011c9",
        "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets t\nwhere (cast(? as text) is null or t.status = ?)\n  and (cast(? as bigint) is null or t.customer_id = ?)\n  and (cast(? as text) = 'any'\n    or (? = 'unassigned' and t.assignee_id is null)\n    or (? = 'assigned' and t.assignee_id = cast(? as bigint)))\norder by t.id asc\nlimit cast(? as integer) offset cast(? as integer);\n",
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
      "mssql": {
        "sourceHash": "sha256:1d30943026b3c464810187dd3097f95a0adbc9026c0123534f2364ef77f011c9",
        "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets t\nwhere (cast(@status as text) is null or t.status = @status)\n  and (cast(@customerId as bigint) is null or t.customer_id = @customerId)\n  and (cast(@assigneeMode as text) = 'any'\n    or (@assigneeMode = 'unassigned' and t.assignee_id is null)\n    or (@assigneeMode = 'assigned' and t.assignee_id = cast(@assigneeId as bigint)))\norder by t.id asc\nlimit cast(@limit as integer) offset cast(@offset as integer);\n",
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
    }
  },
  "get": {
    "analysis": {
      "astParse": "ok",
      "statementKind": "select",
      "rootQueryShape": "simple-select",
      "hasTopLevelOrderBy": false,
      "sourceHash": "sha256:533d20fb5462b2d55c7f8413c9976843cc7afe96f310f676d9a96e238f5cbbc7",
      "safeSort": {
        "insertion": {
          "status": "unresolved",
          "reason": "Safe sort selection requires reviewed top-level ORDER BY terms in the source SQL."
        },
        "sortable": {}
      },
      "optionalConditionCompression": {
        "enabled": true,
        "branches": []
      },
      "resultColumns": [
        "assignee_id",
        "created_at",
        "customer_id",
        "id",
        "priority",
        "status",
        "subject",
        "updated_at"
      ],
      "resultColumnOrder": [
        "id",
        "customer_id",
        "subject",
        "status",
        "priority",
        "assignee_id",
        "created_at",
        "updated_at"
      ],
      "resultColumnTypes": {
        "assignee_id": "unknown",
        "created_at": "unknown",
        "customer_id": "unknown",
        "id": "unknown",
        "priority": "unknown",
        "status": "unknown",
        "subject": "unknown",
        "updated_at": "unknown"
      },
      "resultColumnNullability": {
        "assignee_id": "unknown",
        "created_at": "unknown",
        "customer_id": "unknown",
        "id": "unknown",
        "priority": "unknown",
        "status": "unknown",
        "subject": "unknown",
        "updated_at": "unknown"
      },
      "namedParameters": [
        "id"
      ],
      "parserCapabilities": {
        "parser": {
          "status": "supported"
        },
        "sqlStorage": "unaffected",
        "execution": "unaffected",
        "parameterBinding": "unaffected",
        "logging": "unaffected",
        "resultContract": "supported",
        "optionalConditionCompression": "supported",
        "safeSort": "supported",
        "impactAnalysis": "supported"
      }
    },
    "bindings": {
      "postgres": {
        "sourceHash": "sha256:533d20fb5462b2d55c7f8413c9976843cc7afe96f310f676d9a96e238f5cbbc7",
        "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets where id = $1;\n",
        "orderedNames": [
          "id"
        ],
        "optionalConditionCompression": {
          "branches": []
        }
      },
      "mysql2": {
        "sourceHash": "sha256:533d20fb5462b2d55c7f8413c9976843cc7afe96f310f676d9a96e238f5cbbc7",
        "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets where id = ?;\n",
        "orderedNames": [
          "id"
        ]
      },
      "mssql": {
        "sourceHash": "sha256:533d20fb5462b2d55c7f8413c9976843cc7afe96f310f676d9a96e238f5cbbc7",
        "sql": "select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets where id = @id;\n",
        "orderedNames": [
          "id"
        ]
      }
    }
  },
  "assignTicket": {
    "analysis": {
      "astParse": "ok",
      "statementKind": "update",
      "rootQueryShape": "non-select",
      "hasTopLevelOrderBy": false,
      "sourceHash": "sha256:2c24d70148452abb4c65793a06f5593572510eb2ba8f7c222083fe5b45c4d987",
      "safeSort": {
        "insertion": {
          "status": "unresolved",
          "reason": "Safe sort metadata requires a SELECT query."
        },
        "sortable": {}
      },
      "resultColumns": [
        "assignee_id",
        "created_at",
        "customer_id",
        "id",
        "priority",
        "status",
        "subject",
        "updated_at"
      ],
      "resultColumnOrder": [
        "id",
        "customer_id",
        "subject",
        "status",
        "priority",
        "assignee_id",
        "created_at",
        "updated_at"
      ],
      "resultColumnTypes": {
        "assignee_id": "unknown",
        "created_at": "unknown",
        "customer_id": "unknown",
        "id": "unknown",
        "priority": "unknown",
        "status": "unknown",
        "subject": "unknown",
        "updated_at": "unknown"
      },
      "resultColumnNullability": {
        "assignee_id": "unknown",
        "created_at": "unknown",
        "customer_id": "unknown",
        "id": "unknown",
        "priority": "unknown",
        "status": "unknown",
        "subject": "unknown",
        "updated_at": "unknown"
      },
      "namedParameters": [
        "assigneeId",
        "ticketId"
      ],
      "parserCapabilities": {
        "parser": {
          "status": "supported"
        },
        "sqlStorage": "unaffected",
        "execution": "unaffected",
        "parameterBinding": "unaffected",
        "logging": "unaffected",
        "resultContract": "supported",
        "optionalConditionCompression": "blocked",
        "safeSort": "blocked",
        "impactAnalysis": "supported"
      }
    },
    "bindings": {
      "postgres": {
        "sourceHash": "sha256:2c24d70148452abb4c65793a06f5593572510eb2ba8f7c222083fe5b45c4d987",
        "sql": "update tickets set assignee_id = $1, updated_at = now()\nwhere id = $2\nreturning id, customer_id, subject, status, priority, assignee_id, created_at, updated_at;\n",
        "orderedNames": [
          "assigneeId",
          "ticketId"
        ]
      },
      "mysql2": {
        "sourceHash": "sha256:2c24d70148452abb4c65793a06f5593572510eb2ba8f7c222083fe5b45c4d987",
        "sql": "update tickets set assignee_id = ?, updated_at = now()\nwhere id = ?\nreturning id, customer_id, subject, status, priority, assignee_id, created_at, updated_at;\n",
        "orderedNames": [
          "assigneeId",
          "ticketId"
        ]
      },
      "mssql": {
        "sourceHash": "sha256:2c24d70148452abb4c65793a06f5593572510eb2ba8f7c222083fe5b45c4d987",
        "sql": "update tickets set assignee_id = @assigneeId, updated_at = now()\nwhere id = @ticketId\nreturning id, customer_id, subject, status, priority, assignee_id, created_at, updated_at;\n",
        "orderedNames": [
          "assigneeId",
          "ticketId"
        ]
      }
    }
  },
  "insertEvent": {
    "analysis": {
      "astParse": "ok",
      "statementKind": "insert",
      "rootQueryShape": "non-select",
      "hasTopLevelOrderBy": false,
      "sourceHash": "sha256:1d334229137443f40a186a694161a8c2339c61d4c2bb1530caac1b656f553a48",
      "safeSort": {
        "insertion": {
          "status": "unresolved",
          "reason": "Safe sort metadata requires a SELECT query."
        },
        "sortable": {}
      },
      "resultColumns": [],
      "resultColumnOrder": [],
      "resultColumnTypes": {},
      "resultColumnNullability": {},
      "namedParameters": [
        "ticketId",
        "actorId",
        "note"
      ],
      "parserCapabilities": {
        "parser": {
          "status": "supported"
        },
        "sqlStorage": "unaffected",
        "execution": "unaffected",
        "parameterBinding": "unaffected",
        "logging": "unaffected",
        "resultContract": "supported",
        "optionalConditionCompression": "blocked",
        "safeSort": "blocked",
        "impactAnalysis": "supported"
      }
    },
    "bindings": {
      "postgres": {
        "sourceHash": "sha256:1d334229137443f40a186a694161a8c2339c61d4c2bb1530caac1b656f553a48",
        "sql": "insert into ticket_events (ticket_id, event_type, actor_id, note)\nvalues ($1, 'assigned', $2, $3);\n",
        "orderedNames": [
          "ticketId",
          "actorId",
          "note"
        ]
      },
      "mysql2": {
        "sourceHash": "sha256:1d334229137443f40a186a694161a8c2339c61d4c2bb1530caac1b656f553a48",
        "sql": "insert into ticket_events (ticket_id, event_type, actor_id, note)\nvalues (?, 'assigned', ?, ?);\n",
        "orderedNames": [
          "ticketId",
          "actorId",
          "note"
        ]
      },
      "mssql": {
        "sourceHash": "sha256:1d334229137443f40a186a694161a8c2339c61d4c2bb1530caac1b656f553a48",
        "sql": "insert into ticket_events (ticket_id, event_type, actor_id, note)\nvalues (@ticketId, 'assigned', @actorId, @note);\n",
        "orderedNames": [
          "ticketId",
          "actorId",
          "note"
        ]
      }
    }
  }
} as const;
