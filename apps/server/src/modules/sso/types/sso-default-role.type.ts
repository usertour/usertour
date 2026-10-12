import type { Role } from '@prisma/client';

/**
 * The roles JIT provisioning may hand out (ADR 0014): ADMIN is never granted
 * automatically and OWNER is transfer-only. The column is a `Role`; every write
 * passes `SsoService.assertJitRole`, and the editor-role migration rewrote the
 * rows that predate it. The keys are the wire strings.
 */
export const SsoDefaultRole = {
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const satisfies { [Key in Role]?: Key };

export type SsoDefaultRole = keyof typeof SsoDefaultRole;
