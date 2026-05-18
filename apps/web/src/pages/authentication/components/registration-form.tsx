import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour/button';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { Checkbox } from '@usertour/checkbox';
import { Input } from '@usertour/input';
import { Link, useParams } from 'react-router-dom';
import { SpinnerIcon } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { useSignupMutation } from '@usertour/hooks';
import { useAuthAfterLogin } from './use-auth-after-login';

interface SignUpFormProps {
  inviteCode?: string;
  buttonText?: string;
  className?: string;
  /**
   * When set, a read-only email field is rendered at the top of the form
   * (display-only, not part of submission — the server derives the actual
   * email from the inviteCode). Used by the invite page.
   */
  fixedEmail?: string;
}

export const SignUpForm = ({ inviteCode, buttonText, className, fixedEmail }: SignUpFormProps) => {
  const { t } = useTranslation('ui');
  const { invoke } = useSignupMutation();
  const handleAuthResult = useAuthAfterLogin();
  const { toast } = useToast();
  const { registrationCode } = useParams();

  const isInvite = !!inviteCode;

  const schema = useMemo(() => {
    const base = z.object({
      userName: z
        .string({ required_error: t('auth.errors.fullNameRequired') })
        .max(30)
        .min(4),
      companyName: z.string().max(30).optional(),
      password: z
        .string({ required_error: t('auth.errors.passwordRequired') })
        .max(20)
        .min(8),
      isAccept: z.boolean(),
    });
    if (isInvite) {
      return base;
    }
    return base.superRefine((values, ctx) => {
      const projectName = values.companyName?.trim() ?? '';
      if (projectName.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['companyName'],
          message: t('auth.errors.projectNameRequired'),
        });
      }
    });
  }, [isInvite, t]);

  type SignUpFormValues = z.infer<typeof schema>;

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userName: '', companyName: '', password: '', isAccept: false },
    mode: 'onChange',
  });

  const showError = (title: string) => toast({ variant: 'destructive', title });

  const onSubmit = async (formData: SignUpFormValues) => {
    const code = inviteCode ?? registrationCode;
    if (!formData.isAccept || !code) {
      showError(t('auth.errors.acceptTerms'));
      return;
    }
    try {
      const variables = isInvite
        ? {
            userName: formData.userName,
            password: formData.password,
            code,
            isInvite,
          }
        : {
            userName: formData.userName,
            password: formData.password,
            code,
            isInvite,
            companyName: formData.companyName,
          };
      const result = await invoke(variables);
      handleAuthResult(result);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const submitLabel = buttonText ?? t('auth.signUp.submitButton');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4">
          {fixedEmail && (
            <FormItem>
              <FormLabel>{t('auth.signUp.emailLabel')}</FormLabel>
              <FormControl>
                <Input value={fixedEmail} type="email" readOnly disabled />
              </FormControl>
            </FormItem>
          )}
          <FormField
            control={form.control}
            name="userName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.signUp.nameLabel')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('auth.signUp.namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isInvite && (
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.signUp.projectNameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('auth.signUp.projectNamePlaceholder')}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.signUp.passwordLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.signUp.passwordPlaceholder')}
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-row items-start space-x-3">
          <FormField
            control={form.control}
            name="isAccept"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <span className="text-sm text-muted-foreground">
            {t('auth.signUp.acceptTermsPrefix')}{' '}
            <Link to="/terms" className="underline underline-offset-4 hover:text-primary">
              {t('auth.signUp.termsOfService')}
            </Link>{' '}
            {t('auth.signUp.and')}{' '}
            <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">
              {t('auth.signUp.privacyPolicy')}
            </Link>
          </span>
        </div>
        <Button className={cn('w-full', className)} type="submit" disabled={isSubmitting}>
          {isSubmitting && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
};

SignUpForm.displayName = 'SignUpForm';
