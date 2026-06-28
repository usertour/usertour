import {
  Checkbox,
  ComboboxSelect,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { useGetUserEnvironmentsQuery } from '@usertour/hooks';
import { useRef } from 'react';
import { type Control, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-context';
import { SCOPE_RESOURCES, levelOf, requiresEnvironmentScope, setLevel } from './scopes';

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
    if (requiresEnvironmentScope(val.scopes) && val.environmentIds.length === 0) {
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
 * The name / projects / scopes fields shared by the create and edit dialogs.
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
  const { setValue, trigger } = useFormContext<TokenFormValues>();
  const selectedProjectId = useWatch({ control, name: 'projectIds' })?.[0] ?? '';
  const { environmentList } = useGetUserEnvironmentsQuery(selectedProjectId || undefined);

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
            <FormLabel>{t('settings.personalApiKeys.environmentsLabel')}</FormLabel>
            <FormDescription>{t('settings.personalApiKeys.environmentsHelp')}</FormDescription>
            <FormControl>
              {selectedProjectId ? (
                <div className="space-y-2">
                  {(environmentList ?? []).map((environment) => (
                    <div key={environment.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`env-${environment.id}`}
                        checked={field.value.includes(environment.id)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked === true
                              ? [...field.value, environment.id]
                              : field.value.filter((id) => id !== environment.id),
                          )
                        }
                      />
                      <Label
                        htmlFor={`env-${environment.id}`}
                        className="cursor-pointer font-normal"
                      >
                        {environment.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('settings.personalApiKeys.environmentsPickProject')}
                </p>
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="scopes"
        render={({ field }) => {
          // Whether scopes require an environment is a CROSS-field rule whose error lives on
          // `environmentIds`. Changing scopes alone wouldn't re-validate that field, so the
          // stale "select an environment" error would linger — re-trigger it on every change.
          const setScopes = (next: string[]) => {
            field.onChange(next);
            void trigger('environmentIds');
          };
          return (
            <FormItem>
              <FormLabel>{t('settings.personalApiKeys.scopesLabel')}</FormLabel>
              <TooltipProvider>
                <div className="space-y-2">
                  {SCOPE_RESOURCES.map((resource) => {
                    const level = levelOf(field.value, resource);
                    const readChecked = level !== 'none';
                    const writeChecked = level === 'write';
                    const writeUnavailable = resource.write === null;
                    return (
                      <div key={resource.key} className="flex items-center justify-between gap-4">
                        <Label className="font-normal">{t(resource.labelKey)}</Label>
                        <div className="flex items-center">
                          <div className="flex w-24 items-center gap-2">
                            <Checkbox
                              id={`scope-${resource.key}-read`}
                              checked={readChecked}
                              onCheckedChange={(checked) =>
                                setScopes(
                                  setLevel(
                                    field.value,
                                    resource,
                                    checked === true ? (level === 'none' ? 'read' : level) : 'none',
                                  ),
                                )
                              }
                            />
                            <Label
                              htmlFor={`scope-${resource.key}-read`}
                              className="cursor-pointer font-normal"
                            >
                              {t('settings.personalApiKeys.scopeLevels.read')}
                            </Label>
                          </div>
                          {writeUnavailable ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex w-24 cursor-not-allowed items-center gap-2 opacity-40">
                                  <Checkbox
                                    id={`scope-${resource.key}-write`}
                                    checked={false}
                                    disabled
                                  />
                                  <Label
                                    htmlFor={`scope-${resource.key}-write`}
                                    className="font-normal"
                                  >
                                    {t('settings.personalApiKeys.scopeLevels.write')}
                                  </Label>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t('settings.personalApiKeys.scopeNoWrite')}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="flex w-24 items-center gap-2">
                              <Checkbox
                                id={`scope-${resource.key}-write`}
                                checked={writeChecked}
                                onCheckedChange={(checked) =>
                                  setScopes(
                                    setLevel(
                                      field.value,
                                      resource,
                                      checked === true ? 'write' : 'read',
                                    ),
                                  )
                                }
                              />
                              <Label
                                htmlFor={`scope-${resource.key}-write`}
                                className="cursor-pointer font-normal"
                              >
                                {t('settings.personalApiKeys.scopeLevels.write')}
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
};

TokenFormFields.displayName = 'TokenFormFields';
