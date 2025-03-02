'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-ui/card';
import { Link } from 'react-router-dom';
import {
  SignInSocialProviders,
  SignInDivider,
  SignInForm,
  SignInRoot,
} from './components/sign-in-form';

// Footer component
const SignInFooter = () => (
  <CardFooter>
    <div className="text-center text-sm text-muted-foreground">
      No account yet?{' '}
      <Link to="/auth/signup" className="underline underline-offset-4 hover:text-primary">
        Sign up for a free trial
      </Link>
    </div>
  </CardFooter>
);

SignInFooter.displayName = 'SignInFooter';

const SignInBody = () => {
  return (
    <SignInRoot>
      <CardContent className="grid gap-4">
        <SignInSocialProviders />
        <SignInDivider />
        <SignInForm />
        <SignInFooter />
      </CardContent>
    </SignInRoot>
  );
};

SignInBody.displayName = 'SignInBody';

const SignIn = () => {
  return (
    <SignInRoot>
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Sign in to UserTour
          </CardTitle>
        </CardHeader>
        <SignInBody />
      </Card>
    </SignInRoot>
  );
};

SignIn.displayName = 'SignIn';

export { SignIn };
