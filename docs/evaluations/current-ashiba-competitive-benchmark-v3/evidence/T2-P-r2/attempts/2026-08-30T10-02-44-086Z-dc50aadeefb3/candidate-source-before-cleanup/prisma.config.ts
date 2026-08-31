import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: defineConfig({
    contract: './src/prisma/contract.prisma',
  }),
});
