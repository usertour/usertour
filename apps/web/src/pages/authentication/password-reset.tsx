import { useMemo } from 'react';
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
import { useNavigate, useParams } from 'react-router-dom';
import { useResetUserPasswordByCodeMutation } from '@usertour/hooks';
import { AuthCard } from './components/auth-card';

export const PasswordReset = () => {
  const { t } = useTranslation('ui');
  const { invoke: resetPassword } = useResetUserPasswordByCodeMutation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { code } = useParams();

  const schema = useMemo(
    () =>
      z
        .object({
          password: z
            .string({ required_error: t('auth.errors.passwordRequired') })
            .max(20)
            .min(8),
          repassword: z
            .string({ required_error: t('auth.errors.repeatPasswordRequired') })
            .max(20)
            .min(8),
        })
        .refine((values) => values.password === values.repassword, {
          message: t('auth.errors.passwordMismatch'),
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
        return navigate('/auth/signin');
      }
      toast({ variant: 'destructive', title: t('auth.errors.genericFailure') });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const isSubmitting = form.formState.isSubmitting;

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
