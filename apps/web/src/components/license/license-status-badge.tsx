import { Badge } from '@usertour/ui';

// Soft status-pill styles — tinted bg + matching ring + dark text. Avoids
// the saturated "success/destructive" variants used for action buttons,
// which read too loud for a passive license-state indicator.
export const SOFT_OK_PILL =
  'border-transparent shadow-none ring-1 ring-inset bg-emerald-50 text-emerald-700 hover:bg-emerald-50 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30';
export const SOFT_ERR_PILL =
  'border-transparent shadow-none ring-1 ring-inset bg-red-50 text-red-700 hover:bg-red-50 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/30';

interface LicenseStatusBadgeProps {
  isValid: boolean;
  isExpired?: boolean | null;
}

/**
 * Single source of truth for the Active / Expired / Invalid pill shown on
 * both /admin/subscription (instance license) and /settings/subscription
 * (project license) — keeps the two pages visually identical so users
 * looking at one don't have to re-learn what the colors mean on the other.
 */
export const LicenseStatusBadge = ({ isValid, isExpired }: LicenseStatusBadgeProps) => {
  // Check expired before isValid: an expired license also has isValid=false,
  // and "Expired" is the more useful word for the admin than the generic
  // "Invalid".
  if (isExpired) {
    return <Badge className={SOFT_ERR_PILL}>Expired</Badge>;
  }
  if (!isValid) {
    return <Badge className={SOFT_ERR_PILL}>Invalid</Badge>;
  }
  return <Badge className={SOFT_OK_PILL}>Active</Badge>;
};

/**
 * The Tailwind className for the "Expires on … / Expired on …" date span,
 * so both license pages render the date in matching colors: muted for
 * active (future) expiry, red for already-expired.
 */
export const licenseDateClass = (isExpired?: boolean | null) =>
  isExpired ? 'text-red-600 dark:text-red-300' : 'text-muted-foreground';
