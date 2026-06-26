import { config } from 'dotenv';

config();

if (!process.env.ASHIBA_DB_URL && process.env.ASHIBA_DB_PORT) {
  const port = process.env.ASHIBA_DB_PORT.trim();
  process.env.ASHIBA_DB_URL = `postgres://ashiba:ashiba@localhost:${port}/ashiba`;
}
