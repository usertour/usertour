import type { ReactNode } from 'react';
import { Button } from '@usertour/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour/dialog';
import { Form } from '@usertour/form';
import type { FieldValues } from 'react-hook-form';
import { LoadingButton } from '../loading-button';
import type { UseSettingsFormResult } from './use-settings-form';

export interface SettingsDialogFormProps<TValues extends FieldValues> {
  title: ReactNode;
  /**
   * Subtitle copy shown below the title — rendered inside Radix's
   * `DialogDescription`, satisfying the accessibility requirement that
   * every dialog announces what it's for. When omitted, the dialog
   * explicitly opts out of `aria-describedby` (silencing the Radix
   * warning) and the title alone serves as the announcement.
   */
  description?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: UseSettingsFormResult<TValues>;
  /** Submit button label. Defaults to "Save". */
  submitLabel?: ReactNode;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: ReactNode;
  /**
   * Extra disabled gate for the submit button — on top of the built-in
   * `isSubmitting` lock. Use when dependent data (e.g. a sibling query)
   * must finish loading before submit is safe.
   */
  submitDisabled?: boolean;
  /** Width override for the dialog content (Tailwind classes). */
  contentClassName?: string;
  children: ReactNode;
}

/**
 * Dialog-housed form with the standard cancel + save footer. Used by
 * every `*-edit-form.tsx` / `*-create-form.tsx` under settings.
 */
export function SettingsDialogForm<TValues extends FieldValues>({
  title,
  description,
  open,
  onOpenChange,
  state,
  submitLabel,
  cancelLabel,
  submitDisabled,
  contentClassName,
  children,
}: SettingsDialogFormProps<TValues>) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent
        className={contentClassName}
        // Without a description we explicitly opt out of Radix's
        // aria-describedby so the dev warning stays silent; with one,
        // let Radix link DialogDescription via its own context.
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <Form {...state.form}>
          <form onSubmit={state.onSubmit}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
            <div className="py-4">{children}</div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                {cancelLabel ?? 'Cancel'}
              </Button>
              <LoadingButton type="submit" loading={state.isSubmitting} disabled={submitDisabled}>
                {submitLabel ?? 'Save'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

SettingsDialogForm.displayName = 'SettingsDialogForm';
