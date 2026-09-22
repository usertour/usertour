import type { Prisma } from '@prisma/client';

/** The client handed to callbacks inside a Prisma interactive transaction. */
export type TransactionClient = Prisma.TransactionClient;
