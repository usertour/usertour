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
import { SpinnerIcon } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { useSetupSystemAdminMutation } from '@usertour/hooks';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import * as z from 'zod';
import { useAppContext } from '@/contexts/app-context';
import { AuthCard } from './components/auth-card';

const SetupAdmin = () => {
  const { t } = useTranslation('ui');
  // globalConfig from AppContext (single source); AuthGuard (mode=setup) already
  // waited for it before this route renders, so no local loading gate is needed.
  const { globalConfig } = useAppContext();
  const { invoke, loading } = useSetupSystemAdminMutation();
  const { toast } = useToast();

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(2, t('auth.errors.nameRequired')).max(50),
          email: z.string().email(t('auth.errors.invalidEmail')),
          password: z.string().min(8, t('auth.errors.passwordTooShort')).max(160),
          confirmPassword: z.string().min(8, t('auth.errors.confirmPasswordRequired')).max(160),
        })
        .refine((values) => values.password === values.confirmPassword, {
          message: t('auth.errors.passwordsDoNotMatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );
  type SetupAdminFormValues = z.infer<typeof schema>;

  const form = useForm<SetupAdminFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const onSubmit = async (values: SetupAdminFormValues) => {
    try {
      await invoke({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      // Hard-load so globalConfig.needsSystemAdminSetup re-evaluates and the
      // freshly-set session cookie boots AppContext + LandingRedirect.
      window.location.assign('/');
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  if (globalConfig?.needsSystemAdminSetup === false) {
    return <Navigate to="/auth/signin" replace />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AuthCard
          title={t('auth.setupAdmin.title')}
          description={t('auth.setupAdmin.description')}
          footer={
            <Button className="w-full" type="submit" disabled={loading}>
              {loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.setupAdmin.submitButton')}
            </Button>
          }
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.setupAdmin.nameLabel')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('auth.setupAdmin.namePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.setupAdmin.emailLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.setupAdmin.emailPlaceholder')}
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
                <FormLabel>{t('auth.setupAdmin.passwordLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.setupAdmin.passwordPlaceholder')}
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
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.setupAdmin.confirmPasswordLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.setupAdmin.confirmPasswordPlaceholder')}
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

SetupAdmin.displayName = 'SetupAdmin';

export { SetupAdmin };
