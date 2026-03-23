'use client';

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { Link } from 'react-router-dom';
import { SignUpPrompt } from './sign-up-link';

export const ResetPasswordSuccess = () => {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl  font-semibold tracking-tight">Welcome back!</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Check your inbox, and click the link we just send to you.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col">
        <div className="pt-4 text-center text-sm text-muted-foreground">
          <Link to="/auth/signin" className="underline underline-offset-4 hover:text-primary">
            Back to sign in
          </Link>{' '}
        </div>
        <SignUpPrompt
          prefix="No account yet?"
          className="pt-4 text-center text-sm text-muted-foreground"
        />
      </CardFooter>
    </Card>
  );
};

ResetPasswordSuccess.displayName = 'ResetPasswordSuccess';
