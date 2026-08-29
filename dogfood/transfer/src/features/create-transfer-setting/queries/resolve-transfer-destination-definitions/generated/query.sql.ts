// Application SQL snapshot. The canonical SQL file remains the source of truth.
export const querySql = "select\n    destination_definition_id\n    , destination_definition_name\nfrom\n    rawsql_transfer.destination_definition\nwhere\n    destination_definition_name = any(cast(:destination_definition_names as text[]))\norder by\n    destination_definition_name;\n" as const;
