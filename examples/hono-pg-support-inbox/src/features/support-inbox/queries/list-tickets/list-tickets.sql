with tag_matched_tickets as (
    select distinct
        t.ticket_id
    from public.tickets t
    left join public.ticket_tag_links ttl on ttl.ticket_id = t.ticket_id
    left join public.ticket_tags tt on tt.tag_id = ttl.tag_id
    where (cast(:tag as text) is null or tt.slug = :tag)
),
filtered_tickets as (
    select
        t.ticket_id,
        t.subject,
        c.name as customer_name,
        c.tier as customer_tier,
        t.status,
        t.priority,
        t.language,
        t.channel,
        t.sla_due_at,
        t.created_at,
        t.updated_at,
        case
            when t.sla_due_at is null then 'none'
            when t.sla_due_at < now() then 'breached'
            when t.sla_due_at < now() + interval '4 hours' then 'warning'
            else 'ok'
        end as sla_state,
        case
            when t.sla_due_at is not null and t.sla_due_at < now() then 1
            when t.priority = 'high' and t.status in ('open', 'waiting_agent') then 2
            when c.tier = 'vip' and t.status in ('open', 'waiting_agent') then 3
            when t.sla_due_at is not null and t.sla_due_at < now() + interval '4 hours' then 4
            else 9
        end as action_required,
        case t.priority
            when 'high' then 1
            when 'medium' then 2
            else 3
        end as priority_rank,
        case c.tier
            when 'vip' then 1
            else 2
        end as vip_rank
    from public.tickets t
    join public.customers c on c.customer_id = t.customer_id
    join tag_matched_tickets tmt on tmt.ticket_id = t.ticket_id
    where (cast(:status as text) is null or t.status = :status)
      and (cast(:customerTier as text) is null or c.tier = :customerTier)
      and (
          cast(:slaState as text) is null
          or case
              when t.sla_due_at is null then 'none'
              when t.sla_due_at < now() then 'breached'
              when t.sla_due_at < now() + interval '4 hours' then 'warning'
              else 'ok'
          end = :slaState
      )
      and (cast(:language as text) is null or t.language = :language)
      and (cast(:channel as text) is null or t.channel = :channel)
),
latest_message as (
    select
        ranked.ticket_id,
        ranked.sender_name as latest_sender_name,
        ranked.sender_role as latest_sender_role,
        ranked.body as latest_message_body,
        ranked.created_at as latest_message_at
    from (
        select
            tm.ticket_id,
            tm.sender_name,
            tm.sender_role,
            tm.body,
            tm.created_at,
            row_number() over (
                partition by tm.ticket_id
                order by tm.created_at desc, tm.message_id desc
            ) as message_rank
        from public.ticket_messages tm
        join filtered_tickets ft on ft.ticket_id = tm.ticket_id
    ) ranked
    where ranked.message_rank = 1
),
searchable_tickets as (
    select
        ft.ticket_id,
        ft.subject,
        ft.customer_name,
        ft.customer_tier,
        ft.status,
        ft.priority,
        ft.language,
        ft.channel,
        ft.sla_due_at,
        ft.sla_state,
        ft.created_at,
        ft.updated_at,
        ft.action_required,
        ft.priority_rank,
        ft.vip_rank,
        lm.latest_sender_name,
        lm.latest_sender_role,
        lm.latest_message_body,
        lm.latest_message_at
    from filtered_tickets ft
    left join latest_message lm on lm.ticket_id = ft.ticket_id
    where (
        :keyword is null
        or ft.subject ilike '%' || :keyword || '%'
        or ft.customer_name ilike '%' || :keyword || '%'
        or lm.latest_message_body ilike '%' || :keyword || '%'
    )
),
last_customer_reply as (
    select
        tm.ticket_id,
        max(tm.created_at) as last_customer_reply_at
    from public.ticket_messages tm
    join searchable_tickets st on st.ticket_id = tm.ticket_id
    where tm.sender_role = 'customer'
    group by tm.ticket_id
),
aggregated_tags as (
    select
        ttl.ticket_id,
        array_agg(tt.slug order by tt.slug) as tag_slugs
    from public.ticket_tag_links ttl
    join searchable_tickets st on st.ticket_id = ttl.ticket_id
    join public.ticket_tags tt on tt.tag_id = ttl.tag_id
    group by ttl.ticket_id
)
select
    count(*) over() as total_count,
    st.ticket_id::bigint as ticket_id,
    st.subject::text as subject,
    st.customer_name::text as customer_name,
    st.customer_tier::text as customer_tier,
    st.status::text as status,
    st.priority::text as priority,
    st.language::text as language,
    st.channel::text as channel,
    st.sla_due_at,
    st.sla_state::text as sla_state,
    st.latest_sender_name,
    st.latest_sender_role,
    st.latest_message_body,
    st.latest_message_at,
    lcr.last_customer_reply_at,
    st.created_at,
    st.updated_at,
    coalesce(tags.tag_slugs, array[]::text[]) as tag_slugs,
    st.action_required::integer as action_required,
    st.priority_rank::integer as priority_rank,
    st.vip_rank::integer as vip_rank
from searchable_tickets st
left join last_customer_reply lcr on lcr.ticket_id = st.ticket_id
left join aggregated_tags tags on tags.ticket_id = st.ticket_id
order by st.ticket_id
limit :limit
offset :offset
