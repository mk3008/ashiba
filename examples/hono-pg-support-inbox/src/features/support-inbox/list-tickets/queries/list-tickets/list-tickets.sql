with
    /* タグ条件だけを先に解決し、後続の一覧本体では ticket_id だけで絞り込めるようにする。 */
    /* :tag が未指定なら全チケットを通し、指定された場合だけ該当タグを持つチケットに限定する。 */
    tag_matched_tickets as (
        select distinct
            t.ticket_id
        from
            public.tickets as t
            left join public.ticket_tag_links as ttl on ttl.ticket_id = t.ticket_id
            left join public.ticket_tags as tt on tt.tag_id = ttl.tag_id
        where
            (cast(:tag as text) is null or tt.slug = :tag)
    ),
    /* 一覧の主対象となるチケット集合をここで確定する。 */
    /* チケット、顧客、タグ、SLA、言語、チャネルなど、後続の集計前に適用できる条件はここで寄せる。 */
    /* safe sort 用の action_required、priority_rank、vip_rank もこの段階で算出する。 */
    filtered_tickets as (
        select
            t.ticket_id
            , t.subject
            , c.name as customer_name
            , c.tier as customer_tier
            , t.status
            , t.priority
            , t.language
            , t.channel
            , t.sla_due_at
            , t.created_at
            , t.updated_at
            , case
                when t.sla_due_at is null then
                    'none'
                when t.sla_due_at < now() then
                    'breached'
                when t.sla_due_at < now() + interval '4 hours' then
                    'warning'
                else
                    'ok'
            end as sla_state
            , case
                when t.sla_due_at is not null and t.sla_due_at < now() then
                    1
                when t.priority = 'high' and t.status in ('open', 'waiting_agent') then
                    2
                when c.tier = 'vip' and t.status in ('open', 'waiting_agent') then
                    3
                when t.sla_due_at is not null and t.sla_due_at < now() + interval '4 hours' then
                    4
                else
                    9
            end as action_required
            , case t.priority
                when 'high' then
                    1
                when 'medium' then
                    2
                else
                    3
            end as priority_rank
            , case c.tier
                when 'vip' then
                    1
                else
                    2
            end as vip_rank
        from
            public.tickets as t
            join public.customers as c on c.customer_id = t.customer_id
            join tag_matched_tickets as tmt on tmt.ticket_id = t.ticket_id
        where
            (cast(:status as text) is null or t.status = :status)
            and (cast(:customerTier as text) is null or c.tier = :customerTier)
            and (
                cast(:slaState as text) is null
                or case
                    when t.sla_due_at is null then
                        'none'
                    when t.sla_due_at < now() then
                        'breached'
                    when t.sla_due_at < now() + interval '4 hours' then
                        'warning'
                    else
                        'ok'
                end = :slaState
            )
            and (cast(:language as text) is null or t.language = :language)
            and (cast(:channel as text) is null or t.channel = :channel)
    ),
    /* 各チケットの最新メッセージだけを取り出す。 */
    /* filtered_tickets に結合してから rank することで、一覧対象外のメッセージを読まない。 */
    latest_message as (
        select
            ranked.ticket_id
            , ranked.sender_name as latest_sender_name
            , ranked.sender_role as latest_sender_role
            , ranked.body as latest_message_body
            , ranked.created_at as latest_message_at
        from
            (
                select
                    tm.ticket_id
                    , tm.sender_name
                    , tm.sender_role
                    , tm.body
                    , tm.created_at
                    , row_number() over(
                        partition by
                            tm.ticket_id
                        order by
                            tm.created_at desc
                            , tm.message_id desc
                    ) as message_rank
                from
                    public.ticket_messages as tm
                    join filtered_tickets as ft on ft.ticket_id = tm.ticket_id
            ) as ranked
        where
            ranked.message_rank = 1
    ),
    /* キーワード検索を最新メッセージ取得後に適用する。 */
    /* 件名、顧客名、最新メッセージ本文を横断して検索するため、この段階で検索可能な一覧行を作る。 */
    searchable_tickets as (
        select
            ft.ticket_id
            , ft.subject
            , ft.customer_name
            , ft.customer_tier
            , ft.status
            , ft.priority
            , ft.language
            , ft.channel
            , ft.sla_due_at
            , ft.sla_state
            , ft.created_at
            , ft.updated_at
            , ft.action_required
            , ft.priority_rank
            , ft.vip_rank
            , lm.latest_sender_name
            , lm.latest_sender_role
            , lm.latest_message_body
            , lm.latest_message_at
        from
            filtered_tickets as ft
            left join latest_message as lm on lm.ticket_id = ft.ticket_id
        where
            (
                :keyword is null
                or ft.subject ilike '%' || :keyword || '%'
                or ft.customer_name ilike '%' || :keyword || '%'
                or lm.latest_message_body ilike '%' || :keyword || '%'
            )
    ),
    /* 顧客からの最新返信日時を集計する。 */
    /* safe sort の「顧客からの返信: 新しい順」で使う補助値。 */
    last_customer_reply as (
        select
            tm.ticket_id
            , max(tm.created_at) as last_customer_reply_at
        from
            public.ticket_messages as tm
            join searchable_tickets as st on st.ticket_id = tm.ticket_id
        where
            tm.sender_role = 'customer'
        group by
            tm.ticket_id
    ),
    /* 表示用のタグ slug をチケット単位でまとめる。 */
    /* タグ検索自体は tag_matched_tickets で済ませ、ここは表示値の集約に限定する。 */
    aggregated_tags as (
        select
            ttl.ticket_id
            , array_agg(tt.slug order by
                tt.slug
            ) as tag_slugs
        from
            public.ticket_tag_links as ttl
            join searchable_tickets as st on st.ticket_id = ttl.ticket_id
            join public.ticket_tags as tt on tt.tag_id = ttl.tag_id
        group by
            ttl.ticket_id
    )
/* 最終 select は UI と generated mapper の境界。 */
/* DB固有の型推論に寄りすぎないよう、表示・DTOで使う値は必要に応じて明示 cast する。 */
select
    count(*) over() as total_count
    , cast(st.ticket_id as bigint) as ticket_id
    , cast(st.subject as text) as subject
    , cast(st.customer_name as text) as customer_name
    , cast(st.customer_tier as text) as customer_tier
    , cast(st.status as text) as status
    , cast(st.priority as text) as priority
    , cast(st.language as text) as language
    , cast(st.channel as text) as channel
    , st.sla_due_at
    , cast(st.sla_state as text) as sla_state
    , st.latest_sender_name
    , st.latest_sender_role
    , st.latest_message_body
    , st.latest_message_at
    , lcr.last_customer_reply_at
    , st.created_at
    , st.updated_at
    , coalesce(tags.tag_slugs, cast(array[] as text[])) as tag_slugs
    , cast(st.action_required as integer) as action_required
    , cast(st.priority_rank as integer) as priority_rank
    , cast(st.vip_rank as integer) as vip_rank
from
    searchable_tickets as st
    left join last_customer_reply as lcr on lcr.ticket_id = st.ticket_id
    left join aggregated_tags as tags on tags.ticket_id = st.ticket_id
order by
    st.ticket_id
    , cast(st.subject as text)
    , cast(st.customer_name as text)
    , cast(st.customer_tier as text)
    , cast(st.status as text)
    , st.priority_rank
    , st.sla_due_at
    , cast(st.sla_state as text)
    , st.latest_message_at
    , cast(st.language as text)
    , cast(st.channel as text)
    , st.updated_at desc
    , st.action_required
    , lcr.last_customer_reply_at desc
    , st.vip_rank
limit
    :limit
offset
    :offset;
