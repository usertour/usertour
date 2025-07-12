import { z } from 'zod';

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const flowSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  name: z.string(),
  email: z.string(),
  // name: z.string(),
  environmentId: z.string(),
  // label: z.string(),
  // priority: z.string(),
});

export type Flow = z.infer<typeof flowSchema>;
