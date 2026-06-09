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
} from '@usertour/ui';
import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-context';
import { API_TOKEN_SCOPE_OPTIONS } from './scopes';

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
            <div className="space-y-2">
              {API_TOKEN_SCOPE_OPTIONS.map((scope) => (
                <div key={scope.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`scope-${scope.value}`}
                    checked={field.value.includes(scope.value)}
                    onCheckedChange={(checked) => {
                      field.onChange(
                        checked
                          ? [...field.value, scope.value]
                          : field.value.filter((value) => value !== scope.value),
                      );
                    }}
                  />
                  <Label htmlFor={`scope-${scope.value}`} className="font-normal">
                    {t(scope.labelKey)}
                  </Label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

TokenFormFields.displayName = 'TokenFormFields';
