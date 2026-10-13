import { catalogEntryForSource } from '@usertour/constants';
import {
  AmplitudeSymbolIcon,
  HubspotSymbolIcon,
  type IconProps,
  MixpanelSymbolIcon,
} from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import type { IntegrationProvider } from '@usertour/types';
import type { ComponentType } from 'react';

export interface IntegrationSourceMarkProps {
  /** The provider that owns the record (`source` on an Attribute or Segment), if any. */
  source?: string | null;
  /** Tooltip and accessible label, given the provider's display name. */
  labelFor: (providerName: string) => string;
  className?: string;
}

// Providers with a symbol glyph render it in their brand color — a bare mark
// sits far lighter beside a name than the boxed catalog logo. The rest fall
// back to that logo.
const PROVIDER_SYMBOLS: Partial<
  Record<IntegrationProvider, { Icon: ComponentType<IconProps>; className: string }>
> = {
  amplitude: { Icon: AmplitudeSymbolIcon, className: 'text-[#1e61f0]' },
  hubspot: { Icon: HubspotSymbolIcon, className: 'text-[#ff7a59]' },
  mixpanel: { Icon: MixpanelSymbolIcon, className: 'text-[#7856ff]' },
};

/**
 * The provider mark shown beside records an integration owns — attributes
 * from a CRM (ADR 0013 §6), segments fed by cohort sync (ADR 0012) — so
 * "this came from the integration" reads the same on every surface. Renders
 * nothing when `source` names no provider.
 */
export const IntegrationSourceMark = (props: IntegrationSourceMarkProps) => {
  const { source, labelFor, className } = props;
  const entry = catalogEntryForSource(source);
  if (!entry) {
    return null;
  }
  const label = labelFor(entry.name);
  const symbol = PROVIDER_SYMBOLS[entry.provider];
  if (symbol) {
    // The span carries the tooltip: a `title` attribute on an <svg> is not a
    // reliable tooltip across browsers, and IconProps forbids children.
    return (
      <span title={label} className={cn('inline-flex h-3.5 w-3.5 shrink-0', className)}>
        <symbol.Icon
          role="img"
          aria-label={label}
          className={cn('h-full w-full', symbol.className)}
        />
      </span>
    );
  }
  return (
    <img
      src={entry.imagePath}
      alt={label}
      title={label}
      className={cn('h-3.5 w-3.5 shrink-0 rounded-[2px]', className)}
    />
  );
};

IntegrationSourceMark.displayName = 'IntegrationSourceMark';
