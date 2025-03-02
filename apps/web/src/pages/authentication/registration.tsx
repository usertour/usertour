'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@usertour-ui/card';
import { RegistrationForm, RegistrationRoot } from './components/registration-form';

const RegistrationBody = () => {
  return (
    <RegistrationRoot>
      <CardContent className="grid gap-4">
        <RegistrationForm />
      </CardContent>
    </RegistrationRoot>
  );
};

RegistrationBody.displayName = 'RegistrationBody';

const Registration = () => {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Set up your Usertour account!
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your email and password below to login your account
        </CardDescription>
        <RegistrationBody />
      </CardHeader>
    </Card>
  );
};

Registration.displayName = 'Registration';

export { Registration };
