import { defineConfig } from '@prisma/orm-postgres/config';

export default defineConfig({
  contract: './src/tickets/prisma/contract.prisma',
});
