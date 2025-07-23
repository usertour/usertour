'use client';

import { useMutation } from '@apollo/client';
import { Button } from '@usertour-packages/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { resendMagicLink } from '@usertour-packages/gql';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';

import { Icons } from '@/components/atoms/icons';
import { getErrorMessage } from '@usertour-packages/shared-utils';

export type SignUpSuccessProps = {
  registerId: string;
  email: string;
};

export const SignUpSuccess = ({ registerId, email }: SignUpSuccessProps) => {
  const [resendMutation] = useMutation(resendMagicLink);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  async function onSubmit() {
    try {
      setIsLoading(true);
      const { data } = await resendMutation({ variables: { id: registerId } });
      setIsLoading(false);
      if (!data?.resendMagicLink?.id) {
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
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
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl  font-semibold tracking-tight">Check your inbox</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Click the email verification link we just send to <br />
          {email}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col">
        <Button className="w-full" onClick={onSubmit} disabled={isLoading}>
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Resend verification link
        </Button>
      </CardFooter>
    </Card>
  );
};

SignUpSuccess.displayName = 'SignUpSuccess';
