import { z } from 'zod';

/**
 * A user-facing display name (content / theme). Stored VERBATIM — no trim, no
 * length cap, any unicode — mirroring the builder; the one refused shape is
 * whitespace-only, which passes min(1) yet renders as a blank label nothing can
 * distinguish in a list (same family as the blank-external-id guard).
 */
export const displayName = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, {
    message: 'name must contain at least one non-whitespace character',
  });
