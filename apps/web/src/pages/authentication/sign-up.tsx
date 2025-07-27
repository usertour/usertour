'use client';

import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import { createMagicLink } from '@usertour-packages/gql';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';

import {
  SignUpSuccess,
  SignUpSuccessProps,
} from '@/pages/authentication/components/sign-up-success';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { SpinnerIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const signupFormSchema = z.object({
  email: z
    .string({
      required_error: 'Please input an valid email.',
    })
    .email(),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

const defaultValues: Partial<SignupFormValues> = {
  email: '',
};

export const SignUp = () => {
  const [signupMutation] = useMutation(createMagicLink);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [registerData, setRegisterData] = useState<SignUpSuccessProps | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  async function onSubmit(formData: SignupFormValues) {
    try {
      setIsLoading(true);
      const { data } = await signupMutation({ variables: formData });
      setIsLoading(false);
      if (data.createMagicLink.id) {
        setRegisterData({
          registerId: data.createMagicLink.id,
          email: data.createMagicLink.email,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      setIsLoading(false);
    }
  }

  return (
    <>
      {registerData && <SignUpSuccess {...registerData} />}
      {!registerData && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl  font-semibold tracking-tight">
                  Get ready for the fun to begin!
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your work email" type="email" {...field} />
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
                  Play with Usertour
                </Button>
                <div className="pt-4 text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    to="/auth/signin"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Sign in instead
                  </Link>{' '}
                </div>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </>
  );
};

SignUp.displayName = 'SignUp';
