import type { ListTicketsQueryResult } from './queries/list-tickets/query.js';

export interface SupportInboxResponse {
  items: Array<{
    action_required: number | null;
    channel: string | null;
    created_at: string | null;
    customer_name: string | null;
    customer_tier: string | null;
    language: string | null;
    last_customer_reply_at: string | null;
    latest_message_at: string | null;
    latest_message_body: string | null;
    latest_sender_name: string | null;
    latest_sender_role: string | null;
    priority: string | null;
    priority_rank: number | null;
    sla_due_at: string | null;
    sla_state: string | null;
    status: string | null;
    subject: string | null;
    tag_slugs: string[] | null;
    ticket_id: string | null;
    updated_at: string | null;
    vip_rank: number | null;
  }>;
}

export function buildResult(result: ListTicketsQueryResult[]): SupportInboxResponse {
  return {
    items: result.map((item) => ({
      action_required: item["action_required"],
      channel: item["channel"],
      created_at: item["created_at"],
      customer_name: item["customer_name"],
      customer_tier: item["customer_tier"],
      language: item["language"],
      last_customer_reply_at: item["last_customer_reply_at"],
      latest_message_at: item["latest_message_at"],
      latest_message_body: item["latest_message_body"],
      latest_sender_name: item["latest_sender_name"],
      latest_sender_role: item["latest_sender_role"],
      priority: item["priority"],
      priority_rank: item["priority_rank"],
      sla_due_at: item["sla_due_at"],
      sla_state: item["sla_state"],
      status: item["status"],
      subject: item["subject"],
      tag_slugs: item["tag_slugs"],
      ticket_id: item["ticket_id"],
      updated_at: item["updated_at"],
      vip_rank: item["vip_rank"],
    })),
  };
}
