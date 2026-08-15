import type { GetTicketDetailBeforeDb, GetTicketDetailQueryBoundaryZtdCase } from '../boundary-ztd-types.js';

const beforeDb = {
  public: {
    customers: [
      { customer_id: '1', name: 'Alice Corp', tier: 'vip', locale: 'ja', created_at: '2020-01-01T00:00:00.000Z' },
      { customer_id: '2', name: 'Bob Ltd', tier: 'standard', locale: 'en', created_at: '2020-01-01T00:00:00.000Z' },
    ],
    tickets: [
      {
        ticket_id: '101',
        customer_id: '1',
        subject: 'Billing incident',
        status: 'open',
        priority: 'high',
        language: 'ja',
        channel: 'email',
        sla_due_at: '2020-01-02T00:00:00.000Z',
        created_at: '2020-01-01T01:00:00.000Z',
        updated_at: '2020-01-01T03:00:00.000Z',
        version_key: 1,
        metadata: {},
      },
      {
        ticket_id: '102',
        customer_id: '2',
        subject: 'Question without messages',
        status: 'resolved',
        priority: 'low',
        language: 'en',
        channel: 'web',
        sla_due_at: null,
        created_at: '2020-01-02T01:00:00.000Z',
        updated_at: '2020-01-02T02:00:00.000Z',
        version_key: 2,
        metadata: {},
      },
    ],
    ticket_messages: [
      {
        message_id: '1001',
        ticket_id: '101',
        sender_name: 'Alice',
        sender_role: 'customer',
        body: 'First message',
        created_at: '2020-01-01T01:30:00.000Z',
      },
      {
        message_id: '1002',
        ticket_id: '101',
        sender_name: 'Agent A',
        sender_role: 'agent',
        body: 'Second message',
        created_at: '2020-01-01T02:30:00.000Z',
      },
    ],
  },
} satisfies GetTicketDetailBeforeDb;

const ticket101 = {
  ticket_id: '101',
  subject: 'Billing incident',
  status: 'open',
  priority: 'high',
  language: 'ja',
  channel: 'email',
  sla_due_at: '2020-01-02T00:00:00.000Z',
  created_at: '2020-01-01T01:00:00.000Z',
  updated_at: '2020-01-01T03:00:00.000Z',
  version_key: 1,
  customer_name: 'Alice Corp',
  customer_tier: 'vip',
};

const cases: readonly GetTicketDetailQueryBoundaryZtdCase[] = [
  {
    name: 'joins the customer and orders all messages oldest first',
    beforeDb,
    input: { ticketId: '101' },
    output: [
      {
        ...ticket101,
        message_id: '1001',
        sender_name: 'Alice',
        sender_role: 'customer',
        message_body: 'First message',
        message_created_at: '2020-01-01T01:30:00.000Z',
      },
      {
        ...ticket101,
        message_id: '1002',
        sender_name: 'Agent A',
        sender_role: 'agent',
        message_body: 'Second message',
        message_created_at: '2020-01-01T02:30:00.000Z',
      },
    ],
  },
  {
    name: 'left join preserves a ticket that has no messages',
    beforeDb,
    input: { ticketId: '102' },
    output: [{
      ticket_id: '102',
      subject: 'Question without messages',
      status: 'resolved',
      priority: 'low',
      language: 'en',
      channel: 'web',
      sla_due_at: null,
      created_at: '2020-01-02T01:00:00.000Z',
      updated_at: '2020-01-02T02:00:00.000Z',
      version_key: 2,
      customer_name: 'Bob Ltd',
      customer_tier: 'standard',
      message_id: null,
      sender_name: null,
      sender_role: null,
      message_body: null,
      message_created_at: null,
    }],
  },
];

export default cases;
