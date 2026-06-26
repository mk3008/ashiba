insert into rawsql_transfer.destination_definition(
    destination_definition_name
    , description
    , destination_table_name
    , destination_columns
    , destination_key_columns
    , sequence_expression_definition
    , transfer_model
    , sign_inversion_columns
    , note
)
select
    :destination_definition_name
    , :description
    , :destination_table_name
    , cast(:destination_columns as jsonb)
    , cast(:destination_key_columns as text[])
    , cast(:sequence_expression_definition as jsonb)
    , :transfer_model
    , cast(:sign_inversion_columns as text[])
    , :note
returning
    destination_definition_id
    , destination_definition_name
    , description
    , destination_table_name
    , destination_columns
    , destination_key_columns
    , sequence_expression_definition
    , transfer_model
    , sign_inversion_columns
    , generated_red_transfer_sql_body
    , generated_red_transfer_sql_status
    , generated_red_transfer_sql_error
    , created_at
    , updated_at
    , note;
