create table public.customers (
    customer_id bigserial primary key,
    name text not null,
    tier text not null check (tier in ('vip', 'standard')),
    locale text not null default 'ja',
    created_at timestamptz not null default now()
);

create table public.tickets (
    ticket_id bigserial primary key,
    customer_id bigint not null references public.customers (customer_id),
    subject text not null,
    status text not null check (status in ('open', 'waiting_customer', 'waiting_agent', 'resolved', 'draft')),
    priority text not null check (priority in ('high', 'medium', 'low')),
    language text not null check (language in ('ja', 'en')),
    channel text not null check (channel in ('email', 'chat', 'web')),
    sla_due_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    version_key integer not null default 1,
    metadata jsonb not null default '{}'::jsonb
);

create table public.ticket_messages (
    message_id bigserial primary key,
    ticket_id bigint not null references public.tickets (ticket_id) on delete cascade,
    sender_name text not null,
    sender_role text not null check (sender_role in ('customer', 'agent', 'system')),
    body text not null,
    created_at timestamptz not null
);

create table public.ticket_tags (
    tag_id bigserial primary key,
    slug text not null unique,
    label text not null
);

create table public.ticket_tag_links (
    ticket_id bigint not null references public.tickets (ticket_id) on delete cascade,
    tag_id bigint not null references public.ticket_tags (tag_id) on delete cascade,
    primary key (ticket_id, tag_id)
);

create index ticket_customer_idx on public.tickets (customer_id);
create index ticket_status_idx on public.tickets (status);
create index ticket_sla_due_at_idx on public.tickets (sla_due_at);
create index ticket_updated_at_idx on public.tickets (updated_at);
create index ticket_messages_ticket_created_idx on public.ticket_messages (ticket_id, created_at desc);
