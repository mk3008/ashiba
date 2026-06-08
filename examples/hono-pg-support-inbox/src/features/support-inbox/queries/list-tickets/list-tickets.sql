with latest_message as (
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
    ) ranked
    where ranked.message_rank = 1
),
last_customer_reply as (
    select
        tm.ticket_id,
        max(tm.created_at) as last_customer_reply_at
    from public.ticket_messages tm
    where tm.sender_role = 'customer'
    group by tm.ticket_id
),
aggregated_tags as (
    select
        ttl.ticket_id,
        array_agg(tt.slug order by tt.slug) as tag_slugs
    from public.ticket_tag_links ttl
    join public.ticket_tags tt on tt.tag_id = ttl.tag_id
    group by ttl.ticket_id
)
select
    count(*) over() as total_count,
    t.ticket_id,
    t.subject,
    c.name as customer_name,
    c.tier as customer_tier,
    t.status,
    t.priority,
    t.language,
    t.channel,
    t.sla_due_at,
    case
        when t.sla_due_at is null then 'none'
        when t.sla_due_at < now() then 'breached'
        when t.sla_due_at < now() + interval '4 hours' then 'warning'
        else 'ok'
    end as sla_state,
    lm.latest_sender_name,
    lm.latest_sender_role,
    lm.latest_message_body,
    lm.latest_message_at,
    lcr.last_customer_reply_at,
    t.created_at,
    t.updated_at,
    coalesce(tags.tag_slugs, array[]::text[]) as tag_slugs,
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
left join latest_message lm on lm.ticket_id = t.ticket_id
left join last_customer_reply lcr on lcr.ticket_id = t.ticket_id
left join aggregated_tags tags on tags.ticket_id = t.ticket_id
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
  and (cast(:tag as text) is null or :tag = any(coalesce(tags.tag_slugs, array[]::text[])))
  and (
      :keyword is null
      or t.subject ilike '%' || :keyword || '%'
      or c.name ilike '%' || :keyword || '%'
      or lm.latest_message_body ilike '%' || :keyword || '%'
  )
order by t.ticket_id
limit :limit
offset :offset
