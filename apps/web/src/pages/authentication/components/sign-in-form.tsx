'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import { getAuthConfig, login } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@usertour-ui/form';
import { GithubIcon, GoogleIcon, SpinnerIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { useToast } from '@usertour-ui/use-toast';
import { Link } from 'react-router-dom';
import { apiUrl } from '@/utils/env';

// Form validation schema
const signinFormSchema = z.object({
  email: z
    .string({
      required_error: 'Please select an email to display.',
    })
    .email(),
  password: z.string().max(160).min(4),
});

type SigninFormValues = z.infer<typeof signinFormSchema>;

const defaultValues: Partial<SigninFormValues> = {
  email: '',
  password: '',
};

type AuthProvider = 'email' | 'google' | 'github';
type AuthConfigItem = {
  provider: AuthProvider;
};

// Context type definition
type SignInContextType = {
  isLoading: boolean;
  isGoogleAuthLoading: boolean;
  isGithubAuthLoading: boolean;
  setIsLoading: (value: boolean) => void;
  setIsGoogleAuthLoading: (value: boolean) => void;
  setIsGithubAuthLoading: (value: boolean) => void;
  isGoogleAuthEnabled: boolean;
  isGithubAuthEnabled: boolean;
  isEmailAuthEnabled: boolean;
  handleLogin: (provider: 'github' | 'google') => void;
  loginMutation: ReturnType<typeof useMutation<any>>[0];
  toast: ReturnType<typeof useToast>['toast'];
  authConfig: any;
  showError: (title: string) => void;
  form: ReturnType<typeof useForm<SigninFormValues>>;
  onSubmit: (data: SigninFormValues) => Promise<void>;
};

// Create context
const SignInContext = React.createContext<SignInContextType | undefined>(undefined);

// Custom hook for using SignIn context
const useSignInContext = () => {
  const context = React.useContext(SignInContext);
  if (!context) {
    throw new Error('useSignInContext must be used within a SignInProvider');
  }
  return context;
};

// Root component with context provider
const SignInRoot = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState<boolean>(false);
  const [isGithubAuthLoading, setIsGithubAuthLoading] = useState<boolean>(false);
  const [loginMutation] = useMutation(login);
  const { toast } = useToast();
  const { data: authConfig } = useQuery(getAuthConfig);

  // Show all auth options by default when config is loading
  // Only disable if explicitly set to false in config
  const isEmailAuthEnabled =
    !authConfig?.getAuthConfig ||
    authConfig.getAuthConfig.some((item: AuthConfigItem) => item.provider === 'email');
  const isGithubAuthEnabled =
    !authConfig?.getAuthConfig ||
    authConfig.getAuthConfig.some((item: AuthConfigItem) => item.provider === 'github');
  const isGoogleAuthEnabled =
    !authConfig?.getAuthConfig ||
    authConfig.getAuthConfig.some((item: AuthConfigItem) => item.provider === 'google');

  const form = useForm<SigninFormValues>({
    resolver: zodResolver(signinFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const handleLogin = (provider: 'github' | 'google') => {
    if (provider === 'google') {
      setIsGoogleAuthLoading(true);
    } else if (provider === 'github') {
      setIsGithubAuthLoading(true);
    }
    window.location.href = `${apiUrl}/api/auth/${provider}`;
  };

  const onSubmit = async (data: SigninFormValues) => {
    try {
      setIsLoading(true);
      const ret = await loginMutation({ variables: data });
      if (ret.data.login.redirectUrl) {
        window.location.href = ret.data.login.redirectUrl;
      }
      setIsLoading(false);
    } catch (error) {
      showError(getErrorMessage(error));
      setIsLoading(false);
    }
  };

  return (
    <SignInContext.Provider
      value={{
        isLoading,
        isGoogleAuthLoading,
        isGithubAuthLoading,
        setIsLoading,
        setIsGoogleAuthLoading,
        setIsGithubAuthLoading,
        handleLogin,
        loginMutation,
        toast,
        authConfig,
        showError,
        form,
        onSubmit,
        isGoogleAuthEnabled,
        isGithubAuthEnabled,
        isEmailAuthEnabled,
      }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>{children}</form>
      </Form>
    </SignInContext.Provider>
  );
};

// Social providers component
const SignInSocialProviders = () => {
  const {
    handleLogin,
    isGoogleAuthLoading,
    isGithubAuthLoading,
    isGoogleAuthEnabled,
    isGithubAuthEnabled,
  } = useSignInContext();

  if (!isGoogleAuthEnabled && !isGithubAuthEnabled) return null;

  return (
    <div className="flex flex-row gap-2 w-full">
      {isGoogleAuthEnabled && (
        <Button
          variant="outline"
          className="flex-1"
          type="button"
          onClick={() => handleLogin('google')}
          disabled={isGoogleAuthLoading}
        >
          {isGoogleAuthLoading && <SpinnerIcon className="w-4 h-4 animate-spin mr-1" />}
          <GoogleIcon className="w-4 h-4 mr-2" />
          {isGoogleAuthLoading ? 'Signing in...' : 'Continue with Google'}
        </Button>
      )}
      {isGithubAuthEnabled && (
        <Button
          variant="outline"
          className="flex-1"
          type="button"
          onClick={() => handleLogin('github')}
          disabled={isGithubAuthLoading}
        >
          {isGithubAuthLoading && <SpinnerIcon className="w-4 h-4 animate-spin mr-1" />}
          <GithubIcon className="w-4 h-4 mr-2" />
          {isGithubAuthLoading ? 'Signing in...' : 'Continue with Github'}
        </Button>
      )}
    </div>
  );
};

SignInSocialProviders.displayName = 'SignInSocialProviders';

// Divider component
const SignInDivider = () => {
  const { isGoogleAuthEnabled, isGithubAuthEnabled, isEmailAuthEnabled } = useSignInContext();

  // Only show divider if we have both social providers and email auth enabled
  if (!(isGoogleAuthEnabled || isGithubAuthEnabled) || !isEmailAuthEnabled) return null;

  return (
    <div className="relative w-full">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-100 text-gray-50 dark:border-border" />
      </div>
      <div className="relative flex justify-center text-sm leading-5">
        <span className="px-2 font-medium bg-white text-background-accent dark:text-foreground/60 dark:bg-background">
          Or login with email
        </span>
      </div>
    </div>
  );
};

SignInDivider.displayName = 'SignInDivider';

// Form component
const SignInForm = () => {
  const { form, isLoading, isEmailAuthEnabled } = useSignInContext();

  // Don't render form if email auth is disabled
  if (!isEmailAuthEnabled) return null;

  return (
    <>
      <div className="grid gap-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Enter your email" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-2">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Enter your password" type="password" {...field} />
              </FormControl>
              <FormMessage />
              <div className="flex flex-row justify-end">
                <span className="text-sm font-medium text-muted-foreground leading-none">
                  <Link to="/auth/reset-password" className="hover:text-primary">
                    Forgot your password?
                  </Link>
                </span>
              </div>
            </FormItem>
          )}
        />
      </div>
      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        Login
      </Button>
    </>
  );
};

SignInForm.displayName = 'SignInForm';

export { SignInSocialProviders, SignInDivider, SignInForm, SignInRoot };
