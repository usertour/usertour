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
import { Link } from 'react-router-dom';
import { useCreateMagicLinkMutation } from '@usertour/hooks';
import { useAppContext } from '@/contexts/app-context';
import { AuthCard } from './components/auth-card';
import {
  SignUpSuccess,
  SignUpSuccessProps,
} from '@/pages/authentication/components/sign-up-success';
import { SignUpDisabledCard } from './components/sign-up-disabled-card';

export const SignUp = () => {
  const { t } = useTranslation('ui');
  // globalConfig from AppContext (single source); AuthGuard already waited for
  // it before this guest route renders, so no local loading gate is needed.
  const { globalConfig } = useAppContext();
  const { invoke: createMagicLink } = useCreateMagicLinkMutation();
  const { toast } = useToast();
  const [registerData, setRegisterData] = useState<SignUpSuccessProps | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string({ required_error: t('auth.errors.invalidEmail') })
          .email(t('auth.errors.invalidEmail')),
      }),
    [t],
  );
  type SignupFormValues = z.infer<typeof schema>;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  const onSubmit = async (formData: SignupFormValues) => {
    try {
      const result = await createMagicLink(formData.email);
      if (result?.id) {
        setRegisterData({ registerId: result.id, email: result.email });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  if (registerData) {
    return <SignUpSuccess {...registerData} />;
  }

  if (globalConfig?.allowUserRegistration === false) {
    return <SignUpDisabledCard />;
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AuthCard
          title={t('auth.magicLink.title')}
          footer={
            <>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.magicLink.submitButton')}
              </Button>
              <div className="pt-4 text-center text-sm text-muted-foreground">
                {t('auth.magicLink.alreadyHaveAccount')}{' '}
                <Link to="/auth/signin" className="underline underline-offset-4 hover:text-primary">
                  {t('auth.magicLink.signInInstead')}
                </Link>
              </div>
            </>
          }
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.magicLink.emailLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.magicLink.emailPlaceholder')}
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

SignUp.displayName = 'SignUp';
