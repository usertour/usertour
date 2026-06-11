import {
  Checkbox,
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
import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-context';
import { SCOPE_RESOURCES, levelOf, setLevel } from './scopes';

/** Shared shape for the create + edit token dialogs. */
export const tokenFormSchema = z.object({
  name: z.string().min(2).max(50),
  projectIds: z.array(z.string()).min(1),
  scopes: z.array(z.string()).min(1),
});

export type TokenFormValues = z.infer<typeof tokenFormSchema>;

export const tokenFormDefaults: TokenFormValues = {
  name: '',
  projectIds: [],
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
          <FormItem>
            <FormLabel>{t('settings.personalApiKeys.projectsLabel')}</FormLabel>
            <div className="space-y-2">
              {projects.map((project) => {
                const id = project.id ?? '';
                return (
                  <div key={id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`project-${id}`}
                      checked={field.value.includes(id)}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked
                            ? [...field.value, id]
                            : field.value.filter((value) => value !== id),
                        );
                      }}
                    />
                    <Label htmlFor={`project-${id}`} className="font-normal">
                      {project.name}
                    </Label>
                  </div>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="scopes"
        render={({ field }) => (
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
                              field.onChange(
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
                                field.onChange(
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
        )}
      />
    </div>
  );
};

TokenFormFields.displayName = 'TokenFormFields';
