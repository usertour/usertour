'use client';

import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import { signUp } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';
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
import { Checkbox } from '@usertour-ui/checkbox';
import { Input } from '@usertour-ui/input';
import { Link, useParams } from 'react-router-dom';

const registFormSchema = z.object({
  userName: z
    .string({
      required_error: 'Please input your full name.',
    })
    .max(30)
    .min(4),
  companyName: z
    .string({
      required_error: 'Please input your company name.',
    })
    .max(30)
    .min(4),
  password: z
    .string({
      required_error: 'Please input your password.',
    })
    .max(20)
    .min(8),
  isAccept: z.boolean(),
});

type RegistFormValues = z.infer<typeof registFormSchema>;

const defaultValues: Partial<RegistFormValues> = {
  userName: '',
  isAccept: false,
  companyName: '',
  password: '',
};

export const Registration = () => {
  const [signUpMutation] = useMutation(signUp);
  const { toast } = useToast();
  const { registId } = useParams();

  const form = useForm<RegistFormValues>({
    resolver: zodResolver(registFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  async function onSubmit(formData: RegistFormValues) {
    const { isAccept, ...others } = formData;
    if (!isAccept) {
      showError('You must accept our terms of service and privacy policy.');
      return;
    }
    try {
      const { data } = await signUpMutation({
        variables: { ...others, code: registId },
      });
      if (data.signup.redirectUrl) {
        window.location.href = data.signup.redirectUrl;
      }
      // if (data.signup.accessToken) {
      //   setAuthToken(data.signup.accessToken, -1);
      //   navigate('/env/1/flows');
      // }
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl  font-semibold tracking-tight">
              Set up your Usertour account!
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your email and password below to login your account
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your company name" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="Pick a strong password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2 flex-row">
              <div className="flex flex-row">
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
                <span className="text-sm text-muted-foreground pl-3">
                  I accept Usertour's{' '}
                  <Link to="/terms" className="underline underline-offset-4 hover:text-primary">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">
                    Privacy Policy
                  </Link>{' '}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button className="w-full" type="submit">
              Let's get started
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

Registration.displayName = 'Registration';
