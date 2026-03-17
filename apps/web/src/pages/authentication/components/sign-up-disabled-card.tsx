'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { Button } from '@usertour-packages/button';
import { Link } from 'react-router-dom';

export const SignUpDisabledCard = () => {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Sign up is currently unavailable
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        New account registration has been disabled for this self-hosted instance. Contact your
        system administrator if you need access.
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button asChild variant="outline">
          <Link to="/auth/signin">Back to sign in</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

SignUpDisabledCard.displayName = 'SignUpDisabledCard';
