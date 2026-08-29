// Application SQL snapshot. The canonical SQL file remains the source of truth.
export const querySql = "select\n    customer_id\n    , name\n    , tier\n    , locale\n    , created_at\nfrom\n    public.customers\norder by\n    customer_id\nlimit\n    :limit;\n" as const;
