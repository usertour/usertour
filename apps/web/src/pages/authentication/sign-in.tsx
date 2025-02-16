'use client';

import { useMutation, useQuery } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import { getAuthConfig, login } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Form, FormControl, FormField, FormItem, FormMessage } from '@usertour-ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-ui/card';
import { GithubIcon, GoogleIcon, SpinnerIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { useToast } from '@usertour-ui/use-toast';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '@/utils/env';

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

export const SignIn = () => {
  const [loginMutation] = useMutation(login);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { data } = useQuery(getAuthConfig);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState<boolean>(false);
  const [isGithubAuthLoading, setIsGithubAuthLoading] = useState<boolean>(false);

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

  const onSubmit = async (data: SigninFormValues) => {
    try {
      setIsLoading(true);
      const ret = await loginMutation({ variables: data });
      if (ret.data.login.redirectUrl) {
        window.location.href = ret.data.login.redirectUrl;
      }
      // setAuthToken(ret.data.login.accessToken, -1);
      // window.location.href = '/env/1/flows';
      setIsLoading(false);
    } catch (error) {
      showError(getErrorMessage(error));
      setIsLoading(false);
    }
  };

  const handleLogin = (provider: 'github' | 'google') => {
    if (provider === 'google') {
      setIsGoogleAuthLoading(true);
    } else if (provider === 'github') {
      setIsGithubAuthLoading(true);
    }
    window.location.href = `${apiUrl}/api/auth/${provider}`;
  };

  const isEmailAuthEnabled = data?.getAuthConfig.some(
    (item: AuthConfigItem) => item.provider === 'email',
  );
  const isGithubAuthEnabled = data?.getAuthConfig.some(
    (item: AuthConfigItem) => item.provider === 'github',
  );
  const isGoogleAuthEnabled = data?.getAuthConfig.some(
    (item: AuthConfigItem) => item.provider === 'google',
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl  font-semibold tracking-tight">
              Sign in to UserTour
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
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
            {(isGoogleAuthEnabled || isGithubAuthEnabled) && isEmailAuthEnabled && (
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
            )}
            {isEmailAuthEnabled && (
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
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              No account yet?{' '}
              <Link to="/auth/signup" className="underline underline-offset-4 hover:text-primary">
                Sign up for a free trial
              </Link>{' '}
            </div>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

SignIn.displayName = 'SignIn';
