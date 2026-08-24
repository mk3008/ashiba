import { createPool } from './db.js';
import { assignTicket } from './tickets/assign.js';
import { getTicket } from './tickets/get.js';
import { listTickets } from './tickets/list.js';

const [group, action, first, second] = process.argv.slice(2);
const pool = createPool();
try {
  const result = group === 'tickets' && action === 'list' ? await listTickets(pool)
    : group === 'tickets' && action === 'get' ? await getTicket(pool, first ?? '')
    : group === 'tickets' && action === 'assign' ? await assignTicket(pool, { ticketId: first ?? '', assigneeId: second ?? '', actorId: '1' })
    : (() => { throw new Error('Use: tickets list | tickets get <id> | tickets assign <id> <assignee>'); })();
  console.log(JSON.stringify(result, null, 2));
} finally { await pool.end(); }
