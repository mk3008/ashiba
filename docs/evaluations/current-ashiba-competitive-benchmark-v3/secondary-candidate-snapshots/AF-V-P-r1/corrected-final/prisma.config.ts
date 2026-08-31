import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';
import { definePrismaConfig } from '@prisma/cli-engine';

export default definePrismaConfig({
  orm: ormConfig({ contract: './src/prisma/contract.prisma' }),
});
