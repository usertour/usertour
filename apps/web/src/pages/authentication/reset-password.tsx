import { useMemo, useState } from 'react';
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
import { Link } from 'react-router-dom';
import { AuthCard } from './components/auth-card';
import { ResetPasswordSuccess } from '@/pages/authentication/components/reset-password-success';
import { SignUpPrompt } from './components/sign-up-link';

export const ResetPassword = () => {
  const { t } = useTranslation('ui');
  const { invoke } = useResetUserPasswordMutation();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);

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
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  const onSubmit = async (formData: FormValues) => {
    try {
      const result = await invoke(formData.email);
      if (result?.success) {
        setSuccess(true);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  if (success) {
    return <ResetPasswordSuccess />;
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AuthCard
          title={t('auth.resetPassword.title')}
          description={t('auth.resetPassword.description')}
          footer={
            <>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.resetPassword.submitButton')}
              </Button>
              <div className="pt-4 text-center text-sm text-muted-foreground">
                <Link to="/auth/signin" className="underline underline-offset-4 hover:text-primary">
                  {t('auth.resetPassword.backToSignIn')}
                </Link>
              </div>
              <SignUpPrompt className="pt-4 text-center text-sm text-muted-foreground" />
            </>
          }
        >
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

ResetPassword.displayName = 'ResetPassword';
