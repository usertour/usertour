import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import {
  RiAccountCircle2Line,
  RiArticleLine,
  RiBankCardLine,
  RiBox1Line,
  RiFlashlightLine,
  RiKey2Line,
  RiKeyLine,
  RiPaletteLine,
  RiPlugLine,
  RiProjectorLine,
  RiPuzzleLine,
  RiTeamLine,
} from '@usertour/icons';
import { Capability, type GlobalConfig } from '@usertour/types';

/**
 * Single source of truth for every Settings section.
 *
 * Consumed by:
 *   - `settings-dispatcher.tsx`        (route component dispatch)
 *   - `settings-detail-dispatcher.tsx` (sub-route dispatch)
 *   - `settings-sidebar-nav.tsx`     (sidebar items + grouping + capability gate)
 *   - `admin-settings-layout.tsx`    (muted vs default surface)
 *
 * Adding a section means editing this file only.
 */

export type SettingsSectionKey =
  | 'general'
  | 'themes'
  | 'environments'
  | 'attributes'
  | 'events'
  | 'localizations'
  | 'audit-log'
  | 'team'
  | 'billing'
  | 'subscription'
  | 'account'
  | 'personal-api-keys'
  | 'connected-apps'
  | 'api'
  | 'integrations';

export type SettingsSectionGroup = 'general' | 'account';

/**
 * Deployment mode the section is visible in. Cloud-only items hide on
 * self-hosted instances and vice versa.
 */
export enum SettingsMode {
  CLOUD = 'cloud',
  SELF_HOSTED = 'self-hosted',
}

export interface SettingsSection {
  key: SettingsSectionKey;
  /**
   * Sidebar label. Plain string today; will become an i18n key in Phase 6.
   */
  title: string;
  icon: ReactNode;
  /**
   * Capability the active-project role must hold to see / access this
   * section. Omit for items that aren't project-scoped (e.g. personal
   * Account settings — always visible).
   */
  capability?: Capability;
  group: SettingsSectionGroup;
  mode: readonly SettingsMode[];
  /**
   * `'muted'` opts the section into the muted-background outlet (used by
   * pages that render a card stack on top of a soft background, e.g.
   * account / general). Defaults to `'default'`.
   */
  surface?: 'default' | 'muted';
  /**
   * Extra runtime gate beyond capability — used by Subscription which
   * requires `allowProjectLevelSubscriptionManagement` from globalConfig.
   */
  visible?: (globalConfig: GlobalConfig | undefined) => boolean;
  /**
   * Section is reachable by direct URL (`/settings/:key`) but is
   * intentionally not surfaced in the sidebar. Mirrors the historical
   * setup where localizations and integrations had dispatcher + capability
   * entries but no sidebar item.
   */
  hideFromSidebar?: boolean;
  component: LazyExoticComponent<ComponentType>;
  /**
   * Sub-route component for `/settings/:key/:subKey` URLs. Currently only
   * integrations uses this (provider detail pages).
   */
  detail?: { component: LazyExoticComponent<ComponentType> };
}

const ICON_CLASS = 'w-4 h-4';

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    key: 'general',
    title: 'Project',
    icon: <RiProjectorLine className={ICON_CLASS} />,
    capability: Capability.ProjectManage,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    surface: 'muted',
    component: lazy(() =>
      import('./projects').then((module) => ({ default: module.SettingsProjectDetail })),
    ),
  },
  {
    key: 'themes',
    title: 'Themes',
    icon: <RiPaletteLine className={ICON_CLASS} />,
    capability: Capability.ThemeRead,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    component: lazy(() =>
      import('./themes').then((module) => ({ default: module.SettingsThemeList })),
    ),
  },
  {
    key: 'environments',
    title: 'Environments',
    icon: <RiBox1Line className={ICON_CLASS} />,
    capability: Capability.EnvironmentRead,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    component: lazy(() =>
      import('./environments').then((module) => ({ default: module.SettingsEnvironmentList })),
    ),
  },
  {
    key: 'attributes',
    title: 'Attributes',
    icon: <RiArticleLine className={ICON_CLASS} />,
    capability: Capability.AttributeRead,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    component: lazy(() =>
      import('./attributes').then((module) => ({ default: module.SettingsAttributeList })),
    ),
  },
  {
    key: 'events',
    title: 'Events',
    icon: <RiFlashlightLine className={ICON_CLASS} />,
    capability: Capability.EventRead,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    component: lazy(() =>
      import('./events').then((module) => ({ default: module.SettingsEventList })),
    ),
  },
  {
    key: 'localizations',
    title: 'Localization',
    icon: <RiPaletteLine className={ICON_CLASS} />,
    capability: Capability.LocalizationRead,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    hideFromSidebar: true,
    component: lazy(() =>
      import('./localizations').then((module) => ({ default: module.SettingsLocalizationList })),
    ),
  },
  {
    key: 'audit-log',
    title: 'Audit log',
    icon: <RiArticleLine className={ICON_CLASS} />,
    capability: Capability.AuditRead,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    component: lazy(() =>
      import('./audit-log').then((module) => ({ default: module.AuditLogList })),
    ),
  },
  {
    key: 'team',
    title: 'Team',
    icon: <RiTeamLine className={ICON_CLASS} />,
    capability: Capability.TeamRead,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    component: lazy(() =>
      import('./members').then((module) => ({ default: module.SettingsMemberList })),
    ),
  },
  {
    key: 'billing',
    title: 'Billing',
    icon: <RiBankCardLine className={ICON_CLASS} />,
    capability: Capability.BillingRead,
    group: 'general',
    mode: [SettingsMode.CLOUD],
    component: lazy(() =>
      import('./billing').then((module) => ({ default: module.SettingsBilling })),
    ),
  },
  {
    key: 'subscription',
    title: 'Subscription',
    icon: <RiBankCardLine className={ICON_CLASS} />,
    capability: Capability.BillingRead,
    group: 'general',
    mode: [SettingsMode.SELF_HOSTED],
    visible: (globalConfig) => globalConfig?.allowProjectLevelSubscriptionManagement === true,
    component: lazy(() =>
      import('./subscription').then((module) => ({ default: module.SettingsSubscription })),
    ),
  },
  {
    key: 'account',
    title: 'Profile',
    icon: <RiAccountCircle2Line className={ICON_CLASS} />,
    // Personal account settings — not project-scoped, always visible.
    group: 'account',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    surface: 'muted',
    component: lazy(() =>
      import('./account').then((module) => ({ default: module.SettingsAccountDetail })),
    ),
  },
  {
    key: 'connected-apps',
    title: 'Connected apps',
    icon: <RiPlugLine className={ICON_CLASS} />,
    // Account-level OAuth grants (MCP connectors / AI agents) — always visible.
    group: 'account',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    component: lazy(() =>
      import('./connected-apps').then((m) => ({ default: m.ConnectedAppsList })),
    ),
  },
  {
    key: 'personal-api-keys',
    title: 'Personal API keys',
    icon: <RiKeyLine className={ICON_CLASS} />,
    // Account-level (caller's own tokens across projects) — always visible.
    // Default (non-muted) surface to match the env-key /settings/api list page.
    group: 'account',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    component: lazy(() =>
      import('./personal-api-keys').then((m) => ({ default: m.PersonalApiKeysList })),
    ),
  },
  {
    key: 'api',
    title: 'API',
    icon: <RiKey2Line className={ICON_CLASS} />,
    capability: Capability.AccessTokenRead,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    component: lazy(() => import('./api').then((module) => ({ default: module.SettingsApiList }))),
  },
  {
    key: 'integrations',
    title: 'Integrations',
    icon: <RiPuzzleLine className={ICON_CLASS} />,
    capability: Capability.IntegrationRead,
    group: 'general',
    mode: [SettingsMode.CLOUD, SettingsMode.SELF_HOSTED],
    hideFromSidebar: true,
    component: lazy(() =>
      import('./integrations').then((module) => ({ default: module.SettingsIntegrationList })),
    ),
    detail: {
      component: lazy(() =>
        import('./integrations/components/integration-detail').then((module) => ({
          default: module.IntegrationDetail,
        })),
      ),
    },
  },
];

const SECTION_INDEX: Record<string, SettingsSection> = Object.fromEntries(
  SETTINGS_SECTIONS.map((section) => [section.key, section]),
);

export const findSettingsSection = (key: string | undefined): SettingsSection | undefined =>
  key ? SECTION_INDEX[key] : undefined;
