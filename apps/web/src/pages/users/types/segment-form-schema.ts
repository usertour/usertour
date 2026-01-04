import { z } from 'zod';

// Shared segment name validation schema
export const segmentNameSchema = z
  .string({
    required_error: 'Please enter user segment name.',
  })
  .max(20)
  .min(2);

// Complete schema for creating segment
export const createSegmentFormSchema = z.object({
  dataType: z.enum(['CONDITION', 'MANUAL']),
  name: segmentNameSchema,
});

// Schema for editing segment (name field only)
export const editSegmentFormSchema = z.object({
  name: segmentNameSchema,
});

// Type definitions
export type CreateSegmentFormValues = z.infer<typeof createSegmentFormSchema>;
export type EditSegmentFormValues = z.infer<typeof editSegmentFormSchema>;

// Default values
export const createSegmentDefaultValues: Partial<CreateSegmentFormValues> = {
  name: '',
  dataType: 'CONDITION',
};
