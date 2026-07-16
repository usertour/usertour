import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DateRange } from 'react-day-picker';
import {
  Button,
  ComboboxSelect,
  type ComboboxSelectOption,
  DATE_PRESET_RANGE_GETTERS,
  DateRangePicker,
  type DatePresetKey,
  type DatePresetOption,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { RiCloseLine } from '@usertour/icons';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { useMemberList } from '@/hooks/use-member-list';

export interface AuditFiltersValue {
  source?: string;
  action?: string;
  resourceType?: string;
  environmentId?: string;
  actorUserId?: string;
  dateRange?: DateRange;
  preset?: DatePresetKey | null;
}

// Enum values match exactly what's recorded/displayed (the table shows the raw
// values too), so options use the value capitalized — no per-option i18n.
const SOURCES = ['web', 'api', 'mcp'];
const ACTIONS = ['create', 'update', 'delete'];
const RESOURCE_TYPES = [
  'content',
  'theme',
  'segment',
  'attribute',
  'event',
  'user',
  'company',
  'session',
  'environment',
  'member',
  'localization',
  'api_token',
  'access_token',
  'signing_secret',
  'oauth_grant',
  'integration',
  'sso_provider',
  'project_sso_settings',
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Multi-word technical types get a readable dropdown label (rows still show the raw type).
const RESOURCE_LABELS: Record<string, string> = {
  api_token: 'API key',
  access_token: 'SDK token',
  signing_secret: 'Signing secret',
  oauth_grant: 'Connected app',
  sso_provider: 'SSO provider',
  project_sso_settings: 'SSO settings',
};

/**
 * Filter bar for the audit log. All filters AND together; the server applies them.
 * Takes the React state setter (not a plain onChange) so the DateRangePicker — which
 * calls setDateRange + setSelectedPreset in one handler — uses functional updates and
 * the two calls don't clobber each other.
 */
export const AuditLogFilters = ({
  value,
  setValue,
}: {
  value: AuditFiltersValue;
  setValue: Dispatch<SetStateAction<AuditFiltersValue>>;
}) => {
  const { t } = useTranslation();
  const { environmentList } = useEnvironmentList();
  const { members } = useMemberList();

  const presets: DatePresetOption[] = useMemo(() => {
    const labels: Record<DatePresetKey, string> = {
      today: t('common.datePresets.today'),
      yesterday: t('common.datePresets.yesterday'),
      'last-7-days': t('common.datePresets.last7Days'),
      'last-14-days': t('common.datePresets.last14Days'),
      'last-30-days': t('common.datePresets.last30Days'),
      'last-90-days': t('common.datePresets.last90Days'),
      'this-month': t('common.datePresets.thisMonth'),
      'year-to-date': t('common.datePresets.yearToDate'),
      'all-time': t('common.datePresets.allTime'),
    };
    return (Object.keys(labels) as DatePresetKey[]).map((key) => ({
      key,
      label: labels[key],
      getRange: DATE_PRESET_RANGE_GETTERS[key],
    }));
  }, [t]);

  // Functional updates so multiple setter calls in one handler (the date picker
  // sets range + preset together) don't clobber each other.
  const set = (patch: Partial<AuditFiltersValue>) => setValue((prev) => ({ ...prev, ...patch }));

  const hasFilters = Object.values(value).some((v) => v != null);

  // First option (empty value) clears that single filter back to "all".
  const withAll = (allLabel: string, opts: ComboboxSelectOption[]): ComboboxSelectOption[] => [
    { value: '', label: allLabel },
    ...opts,
  ];

  const sourceOpts = withAll(
    t('settings.auditLog.filters.allSources'),
    SOURCES.map((s) => ({ value: s, label: s.toUpperCase() })),
  );
  const actionOpts = withAll(
    t('settings.auditLog.filters.allActions'),
    ACTIONS.map((a) => ({ value: a, label: cap(a) })),
  );
  const resourceOpts = withAll(
    t('settings.auditLog.filters.allResources'),
    RESOURCE_TYPES.map((r) => ({ value: r, label: RESOURCE_LABELS[r] ?? cap(r) })),
  );
  const envOpts = withAll(
    t('settings.auditLog.filters.allEnvironments'),
    (environmentList ?? []).map((e) => ({ value: e.id, label: e.name })),
  );
  const actorOpts = withAll(
    t('settings.auditLog.filters.allActors'),
    (members ?? [])
      .filter((m) => !m.isInvite && m.userId)
      .map((m) => ({
        value: m.userId as string,
        label: m.name || m.email || (m.userId as string),
      })),
  );

  // Override the ComboboxSelect default `bg-muted` trigger: on a white settings
  // page it reads heavy. `bg-background` matches the outlined date picker (light =
  // white + border); the muted surface's `dark:` variant still wins in dark mode.
  const dd = 'w-36 bg-background hover:bg-accent';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ComboboxSelect
        size="compact"
        className={dd}
        options={sourceOpts}
        value={value.source}
        onValueChange={(v) => set({ source: v || undefined })}
        placeholder={t('settings.auditLog.columns.source')}
      />
      <ComboboxSelect
        size="compact"
        className={dd}
        options={actionOpts}
        value={value.action}
        onValueChange={(v) => set({ action: v || undefined })}
        placeholder={t('settings.auditLog.columns.action')}
      />
      <ComboboxSelect
        size="compact"
        className={dd}
        options={resourceOpts}
        value={value.resourceType}
        onValueChange={(v) => set({ resourceType: v || undefined })}
        placeholder={t('settings.auditLog.columns.resource')}
      />
      <ComboboxSelect
        size="compact"
        className={dd}
        options={envOpts}
        value={value.environmentId}
        onValueChange={(v) => set({ environmentId: v || undefined })}
        placeholder={t('settings.auditLog.filters.environment')}
      />
      <ComboboxSelect
        size="compact"
        className={dd}
        options={actorOpts}
        value={value.actorUserId}
        onValueChange={(v) => set({ actorUserId: v || undefined })}
        placeholder={t('settings.auditLog.columns.actor')}
      />
      <DateRangePicker
        dateRange={value.dateRange}
        setDateRange={(r) =>
          setValue((prev) => ({
            ...prev,
            dateRange: typeof r === 'function' ? r(prev.dateRange) : r,
          }))
        }
        selectedPreset={value.preset ?? null}
        setSelectedPreset={(p) =>
          setValue((prev) => ({
            ...prev,
            preset: typeof p === 'function' ? p(prev.preset ?? null) : p,
          }))
        }
        presets={presets}
        placeholder={t('common.pickADate')}
      />
      {hasFilters && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7.5 w-7.5 shrink-0 text-muted-foreground"
                aria-label={t('settings.auditLog.filters.clear')}
                onClick={() => setValue({})}
              >
                <RiCloseLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('settings.auditLog.filters.clear')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

AuditLogFilters.displayName = 'AuditLogFilters';
