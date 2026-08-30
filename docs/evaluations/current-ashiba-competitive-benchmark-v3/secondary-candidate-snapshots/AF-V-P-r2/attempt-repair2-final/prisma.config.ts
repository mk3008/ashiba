import { defineConfig } from '@prisma/orm-postgres/config';
import { definePrismaConfig } from '@prisma/cli-engine';

export default definePrismaConfig({
  orm: defineConfig({
    contract: './src/tickets/prisma/contract.prisma',
  }),
});
