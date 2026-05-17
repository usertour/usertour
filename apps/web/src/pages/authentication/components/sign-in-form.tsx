import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour/button';
import { getErrorMessage } from '@usertour/helpers';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@usertour/form';
import { SpinnerIcon } from '@usertour/icons';
import { Input } from '@usertour/input';
import { useToast } from '@usertour/use-toast';
import { Link } from 'react-router-dom';
import { LoginMutationVariables, useLoginMutation } from '@usertour/hooks';
import { GlobalConfig } from '@usertour/types';
import { SocialProviders } from './social-providers';
import { useAuthAfterLogin } from './use-auth-after-login';

interface SignInFormProps {
  globalConfig?: GlobalConfig;
  inviteCode?: string;
  buttonText?: string;
}

const resolveAuthFlags = (globalConfig?: GlobalConfig) => {
  const providers = globalConfig?.authProviders;
  return {
    emailEnabled: !providers || providers.includes('email'),
    githubEnabled: !providers || providers.includes('github'),
    googleEnabled: !providers || providers.includes('google'),
  };
};

export const SignInForm = ({ globalConfig, inviteCode, buttonText }: SignInFormProps) => {
  const { t } = useTranslation('ui');
  const { toast } = useToast();
  const { invoke } = useLoginMutation();
  const handleAuthResult = useAuthAfterLogin();
  const flags = resolveAuthFlags(globalConfig);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string({ required_error: t('auth.errors.invalidEmail') })
          .email(t('auth.errors.invalidEmail')),
        password: z
          .string({ required_error: t('auth.errors.passwordRequired') })
          .max(160)
          .min(4),
      }),
    [t],
  );
  type SigninFormValues = z.infer<typeof schema>;

  const form = useForm<SigninFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  const onSubmit = async (data: SigninFormValues) => {
    try {
      const variables: LoginMutationVariables = { ...data };
      if (inviteCode) {
        variables.inviteCode = inviteCode;
      }
      const result = await invoke(variables);
      handleAuthResult(result);
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const submitLabel = buttonText ?? t('auth.signIn.submitButton');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <SocialProviders
          googleEnabled={flags.googleEnabled}
          githubEnabled={flags.githubEnabled}
          emailEnabled={flags.emailEnabled}
          inviteCode={inviteCode}
        />
        {flags.emailEnabled && (
          <>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t('auth.signIn.emailPlaceholder')}
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t('auth.signIn.passwordPlaceholder')}
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="flex flex-row justify-end">
                    <span className="text-sm font-medium text-muted-foreground leading-none">
                      <Link to="/auth/reset-password" className="hover:text-primary">
                        {t('auth.signIn.forgotPassword')}
                      </Link>
                    </span>
                  </div>
                </FormItem>
              )}
            />
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </>
        )}
      </form>
    </Form>
  );
};

SignInForm.displayName = 'SignInForm';
