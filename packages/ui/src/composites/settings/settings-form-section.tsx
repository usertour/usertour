import type { ReactNode } from 'react';
import { Separator } from '../../primitives/separator';
import { Form } from '../../primitives/form';
import type { FieldValues } from 'react-hook-form';
import { LoadingButton } from '../loading-button';
import type { UseSettingsFormResult } from './use-settings-form';

export interface SettingsFormSectionProps<TValues extends FieldValues> {
  title: ReactNode;
  description?: ReactNode;
  /**
   * Submit button label. Required — the primitive stays i18n-agnostic
   * and refuses to default to an English literal; consumers always pass
   * `t('settings.common.save')` (or a section-specific verb).
   */
  submitLabel: ReactNode;
  /**
   * Disable the submit button while the form is pristine. Most settings
   * forms gate on dirty so the user can't trigger a no-op write. Set
   * `false` for forms that always allow submit (e.g. password forms whose
   * fields are all blank by default but still required).
   */
  disableWhenPristine?: boolean;
  state: UseSettingsFormResult<TValues>;
  children: ReactNode;
}

/**
 * Title + separator + `<Form>` + Save button — the standard chrome that
 * `account-profile-form` / `account-email-form` / `account-password-form`
 * / `project-name-form` and others re-implement. Reads from
 * `useSettingsForm`'s result for the loading + dirty state.
 */
export function SettingsFormSection<TValues extends FieldValues>(
  props: SettingsFormSectionProps<TValues>,
) {
  const { title, description, submitLabel, disableWhenPristine = true, state, children } = props;
  return (
    <div className="space-y-6">
      <div className="flex h-10 flex-row items-center justify-between">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <Separator />
      <Form {...state.form}>
        <form onSubmit={state.onSubmit} className="space-y-8">
          {children}
          <LoadingButton
            type="submit"
            loading={state.isSubmitting}
            disabled={disableWhenPristine && state.isPristine}
          >
            {submitLabel}
          </LoadingButton>
        </form>
      </Form>
    </div>
  );
}

SettingsFormSection.displayName = 'SettingsFormSection';
