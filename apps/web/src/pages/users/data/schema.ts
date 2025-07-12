import { z } from 'zod';

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const flowSchema = z.object({
  id: z.string(),
  environmentId: z.string(),
  externalId: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  // label: z.string(),
  // priority: z.string(),
});

export type Flow = z.infer<typeof flowSchema>;
