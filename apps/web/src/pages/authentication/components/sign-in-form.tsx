import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useToast,
} from '@usertour/ui';
import { getErrorMessage } from '@usertour/helpers';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { SpinnerIcon } from '@usertour/icons';
import { LoginMutationVariables, useLoginMutation } from '@usertour/hooks';
import { GlobalConfig } from '@usertour/types';
import { SocialProviders } from './social-providers';
import { useAuthAfterLogin } from './use-auth-after-login';

interface SignInFormProps {
  globalConfig?: GlobalConfig;
  inviteCode?: string;
  buttonText?: string;
  /**
   * When set, the email field is pre-filled with this value and locked. Used
   * by the invite page where the email is determined by the invite code.
   */
  fixedEmail?: string;
  /**
   * Called when the user clicks the "Forgot your password?" link. The owner
   * page handles the transition (typically swapping to a reset-password
   * subview). If omitted, the link is not rendered.
   */
  onForgotPassword?: () => void;
}

const resolveAuthFlags = (globalConfig?: GlobalConfig) => {
  const providers = globalConfig?.authProviders;
  return {
    emailEnabled: !providers || providers.includes('email'),
    githubEnabled: !providers || providers.includes('github'),
    googleEnabled: !providers || providers.includes('google'),
  };
};

export const SignInForm = ({
  globalConfig,
  inviteCode,
  buttonText,
  fixedEmail,
  onForgotPassword,
}: SignInFormProps) => {
  const { t } = useTranslation('ui');
  const { toast } = useToast();
  const { invoke } = useLoginMutation();
  const handleAuthResult = useAuthAfterLogin();
  const flags = resolveAuthFlags(globalConfig);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.errors.invalidEmail')),
        password: z.string().min(8).max(160),
      }),
    [t],
  );
  type SigninFormValues = z.infer<typeof schema>;

  const form = useForm<SigninFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: fixedEmail ?? '', password: '' },
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
                  {fixedEmail && <FormLabel>{t('auth.signIn.emailLabel')}</FormLabel>}
                  <FormControl>
                    <Input
                      placeholder={t('auth.signIn.emailPlaceholder')}
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  {fixedEmail && <FormLabel>{t('auth.signIn.passwordLabel')}</FormLabel>}
                  <FormControl>
                    <Input
                      placeholder={t('auth.signIn.passwordPlaceholder')}
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  {onForgotPassword && (
                    <div className="flex flex-row justify-end">
                      <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-sm font-medium text-muted-foreground leading-none hover:text-primary cursor-pointer"
                      >
                        {t('auth.signIn.forgotPassword')}
                      </button>
                    </div>
                  )}
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
