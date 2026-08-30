import { defineContract } from '@prisma/orm-postgres/contract-builder';

/**
 * The evaluator owns the existing PostgreSQL schema. This no-emit Prisma 8
 * contract supplies Prisma's target codec and plan registry without claiming
 * ownership of schema lifecycle or migrations.
 */
export const ticketContract = defineContract({});
