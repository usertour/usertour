'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@usertour-ui/card';
import {
  RegistrationFormFields,
  RegistrationRoot,
  RegistrationSubmitButton,
} from './components/registration-form';

const Registration = () => {
  return (
    <RegistrationRoot>
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Set up your Usertour account!
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your email and password below to login your account
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <RegistrationFormFields />
          <RegistrationSubmitButton />
        </CardContent>
      </Card>
    </RegistrationRoot>
  );
};

Registration.displayName = 'Registration';

export { Registration };
