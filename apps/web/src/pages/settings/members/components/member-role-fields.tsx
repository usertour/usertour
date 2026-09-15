'use client';

import { useTranslation } from 'react-i18next';
import type { Control, FieldValues, Path, PathValue } from 'react-hook-form';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { useEnvironmentList } from '@/hooks/use-environment-list';
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

export interface MemberRoleFieldsProps<TValues extends MemberRoleFieldsValues & FieldValues> {
  control: Control<TValues>;
  role: string;
  roleLabel: string;
  rolePlaceholder: string;
}

export function MemberRoleFields<TValues extends MemberRoleFieldsValues & FieldValues>(
  props: MemberRoleFieldsProps<TValues>,
) {
  const { control, role, roleLabel, rolePlaceholder } = props;
  const { t } = useTranslation();
  const { environmentList } = useEnvironmentList();
  const roleField = 'role' as Path<TValues>;
  const environmentsField = 'allowedEnvironmentIds' as Path<TValues>;
  const descriptionKey = ROLE_DESCRIPTION_KEYS[role];

  return (
    <>
      <FormField
        control={control}
        name={roleField}
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
                      <CaretSortIcon className="h-4 w-4 opacity-50" />
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
                      onSelect={() =>
                        field.onChange(option.value as PathValue<TValues, Path<TValues>>)
                      }
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
          name={environmentsField}
          render={({ field }) => {
            const selectedIds: string[] = Array.isArray(field.value) ? field.value : [];
            const toggle = (environmentId: string, checked: boolean) => {
              const next = checked
                ? [...new Set([...selectedIds, environmentId])]
                : selectedIds.filter((id) => id !== environmentId);
              field.onChange(next as PathValue<TValues, Path<TValues>>);
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
}

MemberRoleFields.displayName = 'MemberRoleFields';
