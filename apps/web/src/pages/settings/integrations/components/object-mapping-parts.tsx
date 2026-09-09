import type { ReactNode } from 'react';
import {
  HubspotSymbolIcon,
  RiArrowRightLine,
  RiExpandHorizontalSLine,
  UsertourIcon2,
} from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { Skeleton } from '@usertour/ui';
import type { SyncLocalObject, SyncRemoteObject, IntegrationProvider } from '@usertour/types';

/**
 * Presentational pieces shared by the mapping card (read-only) and the
 * mapping dialog (editable): the two sides of a pair are always drawn the
 * same way, so a field reads identically whether it is being chosen or
 * being reviewed.
 */

export type MappingPairSide = 'remote' | 'local';

export interface MappingSideMarkProps {
  side: MappingPairSide;
  provider: IntegrationProvider;
  className?: string;
}

/** The brand mark that tells the two sides of a pair apart. */
export const MappingSideMark = (props: MappingSideMarkProps) => {
  const { side, provider, className } = props;
  if (side === 'local') {
    return <UsertourIcon2 className={cn('h-4 w-4 shrink-0 text-primary', className)} />;
  }
  if (provider === 'hubspot') {
    return <HubspotSymbolIcon className={cn('h-4 w-4 shrink-0 text-[#ff7a59]', className)} />;
  }
  return null;
};

export interface MappingFieldChipProps {
  side: MappingPairSide;
  provider: IntegrationProvider;
  label: string;
  /** Secondary text after the label (a code name, a property name). */
  hint?: string;
  /** Decoration after the text, inside the chip (a type chip, a warning). */
  trailing?: ReactNode;
  /** Renders as a dotted placeholder — "whatever gets picked on the other side". */
  placeholder?: boolean;
  /** The label is not known yet (provider metadata still loading): keep the frame, show a bar. */
  loading?: boolean;
  className?: string;
}

/** One side of a pair: mark, label, optional hint. */
export const MappingFieldChip = (props: MappingFieldChipProps) => {
  const { side, provider, label, hint, trailing, placeholder, loading, className } = props;
  return (
    <span
      className={cn(
        'flex h-9 min-w-0 items-center gap-2 rounded-md border bg-background px-3 text-sm',
        placeholder && 'border-dashed text-muted-foreground',
        className,
      )}
    >
      <MappingSideMark side={side} provider={provider} />
      {loading ? (
        <Skeleton className="h-3.5 w-28" />
      ) : (
        <span className="min-w-0 truncate" title={label}>
          {label}
        </span>
      )}
      {/* No hint while the label is still the raw name (metadata not loaded yet). */}
      {hint && hint !== label && (
        <span className="min-w-0 truncate text-[11px] text-muted-foreground" title={hint}>
          {hint}
        </span>
      )}
      {trailing}
    </span>
  );
};

export interface MappingPairRowProps {
  left: ReactNode;
  right: ReactNode;
  /** `arrow` for a sync direction, `equals` for the match rule. */
  connector: 'arrow' | 'equals';
  /** Badges and actions after the pair. */
  trailing?: ReactNode;
  className?: string;
}

/** `left → right` (or `left = right`) on one line, trailing slot at the end. */
export const MappingPairRow = (props: MappingPairRowProps) => {
  const { left, right, connector, trailing, className } = props;
  return (
    <div className={cn('grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2', className)}>
      {left}
      {connector === 'arrow' ? (
        <RiArrowRightLine className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <span className="w-4 text-center text-sm text-muted-foreground">=</span>
      )}
      {right}
      <span className="flex min-w-[4.5rem] items-center justify-end gap-1">{trailing}</span>
    </div>
  );
};

export interface ObjectPairTitleProps {
  provider: IntegrationProvider;
  providerName: string;
  remoteLabel: string;
  localLabel: string;
  /** `lg` for card headings, `sm` for the dialog title. */
  size?: 'lg' | 'sm';
}

/** "HubSpot Contacts ↔ Usertour Users", each side captioned with its system. */
export const ObjectPairTitle = (props: ObjectPairTitleProps) => {
  const { provider, providerName, remoteLabel, localLabel, size = 'lg' } = props;
  const nameClass = size === 'lg' ? 'text-xl font-medium tracking-tight' : 'text-base font-medium';
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2">
        <MappingSideMark side="remote" provider={provider} className="h-5 w-5" />
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] text-muted-foreground">{providerName}</span>
          <span className={nameClass}>{remoteLabel}</span>
        </span>
      </span>
      <RiExpandHorizontalSLine
        className={cn('shrink-0 text-muted-foreground', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')}
      />
      <span className="flex items-center gap-2">
        <MappingSideMark side="local" provider={provider} className="h-5 w-5" />
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] text-muted-foreground">Usertour</span>
          <span className={nameClass}>{localLabel}</span>
        </span>
      </span>
    </div>
  );
};

/** Attributes the SDK rewrites on every visit — a write-back of one is a firehose. */
export const SYNC_HIGH_CHURN_ATTRIBUTES: ReadonlySet<string> = new Set(['last_seen_at']);

export const objectLabelKeys = (remoteObject: SyncRemoteObject, localObject: SyncLocalObject) => ({
  remote: `settings.integrations.sync.mapping.remoteObjects.${remoteObject}`,
  local: `settings.integrations.sync.mapping.localObjects.${localObject}`,
  /** "contacts and users" / "companies" — the pair as a phrase, for prose. */
  records: `settings.integrations.sync.mapping.records.${remoteObject}`,
});
