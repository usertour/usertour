import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour/button';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { SpinnerIcon } from '@usertour/icons';
import { Input } from '@usertour/input';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { useParams } from 'react-router-dom';
import { useResetUserPasswordByCodeMutation } from '@usertour/hooks';
import { useAppContext } from '@/contexts/app-context';
import { AuthCard } from './components/auth-card';

export const PasswordReset = () => {
  const { t } = useTranslation('ui');
  const { invoke: resetPassword } = useResetUserPasswordByCodeMutation();
  const { toast } = useToast();
  const { code } = useParams();
  const { userInfo, handleLogout } = useAppContext();
  const [success, setSuccess] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8).max(160),
          repassword: z.string().min(8).max(160),
        })
        .refine((values) => values.password === values.repassword, {
          message: t('auth.errors.passwordsDoNotMatch'),
          path: ['repassword'],
        }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', repassword: '' },
    mode: 'onChange',
  });

  const onSubmit = async (formData: FormValues) => {
    if (!code) {
      return toast({ variant: 'destructive', title: t('auth.errors.resetCodeMissing') });
    }
    try {
      const result = await resetPassword(code, formData.password);
      if (result?.success) {
        // Force-logout immediately on success — not deferred to the
        // Continue button. Otherwise a user who sees the success page and
        // closes the tab / switches back to another window keeps a live
        // session for up to the access-token TTL (15 min), which defeats
        // the "password reset = log in again" expectation. Covers two
        // shapes the route serves now that it's reachable in any auth
        // state:
        //   - Currently logged in as the same account whose password was
        //     just reset (access token still valid, refresh token revoked
        //     server-side — without explicit logout, current session keeps
        //     working until the JWT expires).
        //   - Currently logged in as a different account (opened the reset
        //     email in a browser already logged in elsewhere) — their
        //     session must not silently linger.
        if (userInfo) {
          await handleLogout();
        }
        setSuccess(true);
        return;
      }
      toast({ variant: 'destructive', title: t('auth.errors.genericFailure') });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  // Cookies were already cleared in onSubmit; this just navigates. The hard
  // reload guarantees the SPA boots fresh on /auth/signin with no cached
  // userInfo or Apollo state.
  const continueToSignIn = () => {
    window.location.assign('/auth/signin');
  };

  const isSubmitting = form.formState.isSubmitting;

  if (success) {
    return (
      <AuthCard
        title={t('auth.passwordReset.success.title')}
        description={t('auth.passwordReset.success.description')}
        footer={
          <Button className="w-full" type="button" onClick={continueToSignIn}>
            {t('auth.passwordReset.success.continueButton')}
          </Button>
        }
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AuthCard
          title={t('auth.passwordReset.title')}
          description={t('auth.passwordReset.description')}
          footer={
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.passwordReset.submitButton')}
            </Button>
          }
        >
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.passwordReset.newPasswordLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.passwordReset.newPasswordPlaceholder')}
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="repassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.passwordReset.repeatPasswordLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.passwordReset.repeatPasswordPlaceholder')}
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </AuthCard>
      </form>
    </Form>
  );
};

PasswordReset.displayName = 'PasswordReset';
