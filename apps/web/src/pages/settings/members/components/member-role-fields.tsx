'use client';

import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { RiExpandUpDownLine } from '@usertour/icons';
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Label,
} from '@usertour/ui';
import { TeamMemberRole } from '@usertour/types';
import { z } from 'zod';

// Owner is granted via the transfer-ownership flow, never here.
export const INVITABLE_ROLE_OPTIONS = [
  { value: TeamMemberRole.ADMIN, i18nKey: 'settings.team.roles.admin' },
  { value: TeamMemberRole.EDITOR, i18nKey: 'settings.team.roles.editor' },
  { value: TeamMemberRole.VIEWER, i18nKey: 'settings.team.roles.viewer' },
] as const;

const ROLE_DESCRIPTION_KEYS: Record<string, string> = {
  [TeamMemberRole.ADMIN]: 'settings.team.roleDescriptions.admin',
  [TeamMemberRole.EDITOR]: 'settings.team.roleDescriptions.editor',
  [TeamMemberRole.VIEWER]: 'settings.team.roleDescriptions.viewer',
};

/** The role + publish-whitelist fields shared by the invite and change-role dialogs. */
export const memberRoleFieldsSchema = z.object({
  role: z.string(),
  // EDITOR only: environments the member may publish to. Ignored for other
  // roles (the server clears it); an empty list is a valid "publishes nowhere".
  allowedEnvironmentIds: z.array(z.string()),
});

export type MemberRoleFieldsValues = z.infer<typeof memberRoleFieldsSchema>;

export interface MemberRoleFieldsProps {
  roleLabel: string;
  rolePlaceholder: string;
}

/**
 * Renders inside the dialog's FormProvider (SettingsDialogForm) and reads the
 * form through context, so a host form only needs to extend
 * memberRoleFieldsSchema — same pattern as the personal API key token form.
 */
export const MemberRoleFields = (props: MemberRoleFieldsProps) => {
  const { roleLabel, rolePlaceholder } = props;
  const { t } = useTranslation();
  const { control, watch } = useFormContext<MemberRoleFieldsValues>();
  const { environmentList } = useEnvironmentList();
  const role = watch('role');
  const descriptionKey = ROLE_DESCRIPTION_KEYS[role];

  return (
    <>
      <FormField
        control={control}
        name="role"
        render={({ field }) => {
          const selected = INVITABLE_ROLE_OPTIONS.find((option) => option.value === field.value);
          return (
            <FormItem>
              <FormLabel>{roleLabel}</FormLabel>
              {/* modal={false}: parent Dialog already traps focus;
                  skipping the dropdown's own trap avoids the
                  aria-hidden conflict on the still-focused trigger. */}
              <DropdownMenu modal={false}>
                <FormControl>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {selected ? t(selected.i18nKey) : rolePlaceholder}
                      <RiExpandUpDownLine className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                </FormControl>
                <DropdownMenuContent
                  align="start"
                  className="w-[--radix-dropdown-menu-trigger-width]"
                >
                  {INVITABLE_ROLE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => field.onChange(option.value)}
                    >
                      {t(option.i18nKey)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {descriptionKey ? <FormDescription>{t(descriptionKey)}</FormDescription> : null}
              <FormMessage />
            </FormItem>
          );
        }}
      />
      {role === TeamMemberRole.EDITOR ? (
        <FormField
          control={control}
          name="allowedEnvironmentIds"
          render={({ field }) => {
            const selectedIds = field.value ?? [];
            const toggle = (environmentId: string, checked: boolean) => {
              field.onChange(
                checked
                  ? [...new Set([...selectedIds, environmentId])]
                  : selectedIds.filter((id) => id !== environmentId),
              );
            };
            return (
              <FormItem>
                <FormLabel>{t('settings.team.publishEnvironments.label')}</FormLabel>
                <div className="space-y-2">
                  {environmentList?.length ? (
                    environmentList.map((environment) => (
                      <div key={environment.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`publish-env-${environment.id}`}
                          checked={selectedIds.includes(environment.id)}
                          onCheckedChange={(checked) => toggle(environment.id, checked === true)}
                        />
                        <Label htmlFor={`publish-env-${environment.id}`} className="font-normal">
                          {environment.name}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('settings.team.publishEnvironments.none')}
                    </p>
                  )}
                </div>
                <FormDescription>{t('settings.team.publishEnvironments.help')}</FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      ) : null}
    </>
  );
};

MemberRoleFields.displayName = 'MemberRoleFields';
