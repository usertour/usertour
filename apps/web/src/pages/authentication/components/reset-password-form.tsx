import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { SpinnerIcon } from '@usertour/icons';
import { Input } from '@usertour/input';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { useResetUserPasswordMutation } from '@usertour/hooks';

interface ResetPasswordFormProps {
  /**
   * Called when the user clicks the "Back to sign in" link below the form.
   * The owner page is responsible for switching its own view state back to
   * the sign-in surface — this component does not navigate.
   */
  onBack: () => void;
  /**
   * Called once the reset email has been queued server-side. The email that
   * was used is passed so the owner can show "we sent an email to <email>"
   * on the success view.
   */
  onSuccess: (email: string) => void;
  /**
   * When set, the email field is pre-filled and locked. Used by the invite
   * page where the email is fixed to invite.email.
   */
  fixedEmail?: string;
}

export const ResetPasswordForm = ({ onBack, onSuccess, fixedEmail }: ResetPasswordFormProps) => {
  const { t } = useTranslation('ui');
  const { invoke } = useResetUserPasswordMutation();
  const { toast } = useToast();

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string({ required_error: t('auth.errors.invalidEmail') })
          .email(t('auth.errors.invalidEmail')),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: fixedEmail ?? '' },
    mode: 'onChange',
  });

  const onSubmit = async (formData: FormValues) => {
    try {
      const result = await invoke(formData.email);
      if (result?.success) {
        onSuccess(formData.email);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.resetPassword.emailLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('auth.resetPassword.emailPlaceholder')}
                  type="email"
                  {...field}
                  readOnly={!!fixedEmail}
                  disabled={!!fixedEmail}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
          {t('auth.resetPassword.submitButton')}
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-primary cursor-pointer"
        >
          {t('auth.resetPassword.backToSignIn')}
        </button>
      </form>
    </Form>
  );
};

ResetPasswordForm.displayName = 'ResetPasswordForm';
