'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-ui/form';
import { Checkbox } from '@usertour-ui/checkbox';
import { Input } from '@usertour-ui/input';
import { Link, useParams } from 'react-router-dom';
import { SpinnerIcon } from '@usertour-ui/icons';
import { cn } from '@usertour-ui/ui-utils';
import { useSignupMutation } from '@usertour-ui/shared-hooks';

// Form validation schema
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
    .min(4)
    .optional(),
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

// Context type definition
type RegistrationContextType = {
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  form: ReturnType<typeof useForm<RegistFormValues>>;
  onSubmit: (data: RegistFormValues) => Promise<void>;
  showError: (title: string) => void;
  registrationCode: string | undefined;
  inviteCode: string | undefined;
};

// Create context
const RegistrationContext = React.createContext<RegistrationContextType | undefined>(undefined);

// Custom hook for using Registration context
const useRegistrationContext = () => {
  const context = React.useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistrationContext must be used within a RegistrationProvider');
  }
  return context;
};

// Root component with context provider
const RegistrationRoot = ({
  children,
  inviteCode,
}: {
  children: React.ReactNode;
  inviteCode?: string;
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [signUpMutation] = useMutation(signUp);
  const { invoke } = useSignupMutation();
  const { toast } = useToast();
  const { registrationCode } = useParams();

  const formSchema = inviteCode ? registFormSchema.omit({ companyName: true }) : registFormSchema;

  const form = useForm<RegistFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      ...(inviteCode && { companyName: undefined }),
    },
    mode: 'onChange',
  });

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const onSubmit = async (formData: RegistFormValues) => {
    const { isAccept, ...others } = formData;
    const code = inviteCode ? inviteCode : registrationCode;
    const isInvite = !!inviteCode;

    if (!isAccept || !code) {
      showError('You must accept our terms of service and privacy policy.');
      return;
    }
    try {
      setIsLoading(true);
      const baseVariables = {
        userName: others.userName,
        password: others.password,
        code,
        isInvite,
      };

      const variables = isInvite
        ? baseVariables
        : {
            ...baseVariables,
            companyName: others.companyName,
          };
      const data = await invoke(variables);
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RegistrationContext.Provider
      value={{
        isLoading,
        setIsLoading,
        form,
        onSubmit,
        showError,
        registrationCode,
        inviteCode,
      }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>{children}</form>
      </Form>
    </RegistrationContext.Provider>
  );
};

RegistrationRoot.displayName = 'RegistrationRoot';

// Form Fields component
const RegistrationFormFields = () => {
  const { form, inviteCode } = useRegistrationContext();

  return (
    <>
      <div className="grid gap-4">
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
        {!inviteCode && (
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
        )}
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
          I accept Usertour's{' '}
          <Link to="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </Link>
        </span>
      </div>
    </>
  );
};

RegistrationFormFields.displayName = 'RegistrationFormFields';

interface RegistrationSubmitButtonProps {
  buttonText?: string;
  className?: string;
}

const RegistrationSubmitButton = (props: RegistrationSubmitButtonProps) => {
  const { buttonText = "Let's get started", className } = props;
  const { isLoading } = useRegistrationContext();

  return (
    <Button className={cn('w-full', className)} type="submit" disabled={isLoading}>
      {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
};

RegistrationSubmitButton.displayName = 'RegistrationSubmitButton';

export { RegistrationFormFields, RegistrationSubmitButton, RegistrationRoot };
