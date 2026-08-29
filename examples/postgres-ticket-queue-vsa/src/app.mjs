import { createTicketApplication } from './tickets/application/tickets.mjs';

const app = createTicketApplication();
const result = await app.list({ limit: 10, offset: 0 });
console.log(JSON.stringify(result.rows));
await app.close();
