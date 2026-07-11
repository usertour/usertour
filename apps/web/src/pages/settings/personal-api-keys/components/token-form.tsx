import {
  ComboboxSelect,
  FacetedMultiSelect,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  QuestionTooltip,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@usertour/ui';
import { useGetUserEnvironmentsQuery } from '@usertour/hooks';
import type { Capability, Project } from '@usertour/types';
import { useRef, useEffect } from 'react';
import { type Control, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  SCOPE_PRESETS,
  ScopesGrid,
  presetOf,
  environmentSelectionMissing,
} from '@/components/token-scopes';
import { useAppContext } from '@/contexts/app-context';

/** Shared shape for the create + edit token dialogs. */
export const tokenFormSchema = z
  .object({
    name: z.string().min(2).max(50),
    projectIds: z.array(z.string()).min(1),
    // Environments this token may act on. Empty = "all" (only allowed when no scope is
    // env-targeted — see the superRefine); the UI never pre-selects an environment.
    environmentIds: z.array(z.string()),
    scopes: z.array(z.string()).min(1),
  })
  .superRefine((val, ctx) => {
    if (environmentSelectionMissing(val.scopes, val.environmentIds)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['environmentIds'],
        message: 'Select at least one environment for the selected scopes',
      });
    }
  });

export type TokenFormValues = z.infer<typeof tokenFormSchema>;

export const tokenFormDefaults: TokenFormValues = {
  name: '',
  projectIds: [],
  environmentIds: [],
  scopes: [],
};

interface TokenFormFieldsProps {
  control: Control<TokenFormValues>;
}

/**
 * The name / project / environments / scopes fields shared by the create and edit dialogs.
 * Both dialogs wire it to their own react-hook-form instance via `control`.
 */
export const TokenFormFields = ({ control }: TokenFormFieldsProps) => {
  const { projects } = useAppContext();
  const { t } = useTranslation();
  // Portal the combobox popup inside the dialog so it stays clickable/scrollable
  // (a body-portaled popup is dead under the dialog's react-remove-scroll).
  const projectPortalRef = useRef<HTMLDivElement>(null);
  // The environment checklist lists the SELECTED project's environments (the form picks
  // one project). On project change we clear the env selection (old-project envs are invalid).
  const { setValue, trigger, getValues } = useFormContext<TokenFormValues>();
  const selectedProjectId = useWatch({ control, name: 'projectIds' })?.[0] ?? '';
  const { environmentList } = useGetUserEnvironmentsQuery(selectedProjectId || undefined);

  // Bound the scope picker by the caller's ROLE on the selected project — a key
  // can't be minted with more power than that role grants (the server enforces
  // this at use time via role ∩ scope, so unbounded scopes just create silently
  // dead write access). Mirrors the OAuth consent grid. `capabilities` is the
  // server-computed set the whole Settings gate already relies on; undefined
  // (no project chosen, or projects still loading) leaves the grid unrestricted.
  const selectedProject = projects.find((p) => (p as { id?: string }).id === selectedProjectId) as
    | (Project & { capabilities?: Capability[] })
    | undefined;
  const availableScopes = selectedProject?.capabilities;

  // A single-environment project is unambiguous — pre-check its only environment once
  // the list loads (safe-first "none pre-selected" only protects when there is a choice).
  // Keyed on the loaded list, not the selection, so un-checking isn't fought.
  useEffect(() => {
    if (environmentList?.length === 1 && getValues('environmentIds').length === 0) {
      setValue('environmentIds', [environmentList[0].id], { shouldValidate: true });
    }
  }, [environmentList, getValues, setValue]);

  // Switching to a project where the role grants less must DROP now-out-of-scope
  // selections — the grid only disables them, so they'd otherwise linger in the
  // value and submit. Skip while capabilities are unresolved (empty/undefined) so
  // an edit's legitimate scopes aren't wiped before `projects` loads.
  useEffect(() => {
    if (!availableScopes?.length) return;
    const current = getValues('scopes');
    const filtered = current.filter((s) => availableScopes.includes(s as Capability));
    if (filtered.length !== current.length) {
      setValue('scopes', filtered, { shouldValidate: true });
    }
  }, [availableScopes, getValues, setValue]);

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('settings.personalApiKeys.nameLabel')}</FormLabel>
            <FormControl>
              <Input placeholder={t('settings.personalApiKeys.namePlaceholder')} {...field} />
            </FormControl>
            <FormDescription>{t('settings.common.changeableLater')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="projectIds"
        render={({ field }) => (
          // Single project per token: backend ApiTokenOnProject stays 1..N, but the
          // UI exposes one (required by MCP, smaller blast radius). field.value stays
          // a 1-element array.
          <FormItem className="flex flex-col">
            <FormLabel>{t('settings.personalApiKeys.projectLabel')}</FormLabel>
            <FormControl>
              <div ref={projectPortalRef}>
                <ComboboxSelect
                  // bg-transparent + shadow-xs to match the Name <Input> above (the
                  // composite defaults to bg-muted); content min-w pinned to the
                  // trigger width (the default adds 1.75rem).
                  className="w-full bg-transparent shadow-xs hover:bg-transparent"
                  contentClassName="min-w-[var(--anchor-width)]"
                  value={field.value[0] ?? ''}
                  onValueChange={(value) => {
                    field.onChange([value]);
                    // Reset env selection — environments belong to the previous project.
                    setValue('environmentIds', [], { shouldValidate: true });
                  }}
                  options={projects.map((project) => ({
                    value: project.id ?? '',
                    label: project.name ?? '',
                  }))}
                  placeholder={t('settings.personalApiKeys.projectPlaceholder')}
                  searchPlaceholder={t('settings.personalApiKeys.projectSearch')}
                  emptyText={t('settings.personalApiKeys.projectEmpty')}
                  container={projectPortalRef}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="environmentIds"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1.5">
              <FormLabel>{t('settings.personalApiKeys.environmentsLabel')}</FormLabel>
              <QuestionTooltip>{t('settings.personalApiKeys.environmentsHelp')}</QuestionTooltip>
            </div>
            <FormControl>
              <div>
                {selectedProjectId ? (
                  <FacetedMultiSelect
                    label={t('settings.personalApiKeys.environmentsSelect')}
                    options={(environmentList ?? []).map((e) => ({ label: e.name, value: e.id }))}
                    value={field.value}
                    onChange={field.onChange}
                    withoutPortal
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('settings.personalApiKeys.environmentsPickProject')}
                  </p>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="scopes"
        render={({ field }) => {
          // The env requirement is a CROSS-field rule whose error lives on `environmentIds`;
          // changing scopes alone wouldn't re-validate it, so re-trigger on each change.
          // Bound every scope change to the role's capabilities so a preset (which
          // replaces the whole set) can't grant more than the grid allows.
          const setScopes = (next: string[]) => {
            const bounded = availableScopes
              ? next.filter((s) => availableScopes.includes(s as Capability))
              : next;
            field.onChange(bounded);
            void trigger('environmentIds');
          };
          // Preset picker: shows the matching preset when the current selection IS
          // one, otherwise the placeholder (custom). Applying one replaces the set.
          const preset = presetOf(field.value);
          return (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{t('settings.personalApiKeys.scopesLabel')}</FormLabel>
                <Select
                  value={preset?.key ?? ''}
                  onValueChange={(key) => {
                    const chosen = SCOPE_PRESETS.find((p) => p.key === key);
                    if (chosen) {
                      setScopes([...chosen.scopes]);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-52">
                    {/* Manual label: Radix SelectValue treats a controlled '' as a value and
                        renders blank instead of the placeholder. */}
                    <span className={preset ? undefined : 'text-muted-foreground'}>
                      {preset
                        ? t(preset.labelKey)
                        : t('settings.personalApiKeys.presets.placeholder')}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_PRESETS.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {t(p.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ScopesGrid value={field.value} onChange={setScopes} available={availableScopes} />
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
};

TokenFormFields.displayName = 'TokenFormFields';
