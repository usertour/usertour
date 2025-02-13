'use client';

import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import { login } from '@usertour-ui/gql';
import { getErrorMessage, setAuthToken } from '@usertour-ui/shared-utils';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@usertour-ui/card';
import { SpinnerIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { useToast } from '@usertour-ui/use-toast';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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

export const SignIn = () => {
  const [loginMutation] = useMutation(login);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      setIsLoading(false);
      setAuthToken(ret.data.login.accessToken, -1);
      window.location.href = '/env/1/flows';
    } catch (error) {
      showError(getErrorMessage(error));
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl  font-semibold tracking-tight">Welcome back!</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your email and password below to login your account
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
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
                    <div className="flex flex-row justify-between">
                      <FormLabel>Password</FormLabel>
                      <span className="text-sm font-medium text-muted-foreground leading-none">
                        <Link to="/auth/reset-password" className="hover:text-primary">
                          Forgot your password?
                        </Link>
                      </span>
                    </div>
                    <FormControl>
                      <Input placeholder="Enter your password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              Sign In with Email
            </Button>
            <div className="pt-4 text-center text-sm text-muted-foreground">
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
