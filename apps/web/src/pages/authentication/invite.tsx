import { CardContent, CardFooter } from '@usertour-ui/card';
import { useParams } from 'react-router-dom';
import { useGetInviteQuery } from '@usertour-ui/shared-hooks';
import {
  SignInDivider,
  SignInForm,
  SignInSocialProviders,
  SignInRoot,
} from './components/sign-in-form';
import { Card, CardHeader, CardTitle } from '@usertour-ui/card';
import {
  RegistrationFormFields,
  RegistrationRoot,
  RegistrationSubmitButton,
} from './components/registration-form';
import React from 'react';

const InviteHeader = () => {
  const { inviteId } = useInviteContext();
  const { data } = useGetInviteQuery(inviteId);
  return (
    <CardHeader className="space-y-1 text-center">
      <CardTitle>
        <p className="text-lg font-normal">
          {data?.user?.name} invites you to join {data?.project?.name}
        </p>
        <p className="text-sm text-muted-foreground">Sign in with your account to join them.</p>
      </CardTitle>
    </CardHeader>
  );
};

// Add context definition
type InviteContextType = {
  showRegistration: boolean;
  setShowRegistration: (show: boolean) => void;
  inviteId: string;
};

const InviteContext = React.createContext<InviteContextType | undefined>(undefined);

// Add hook for using the context
const useInviteContext = () => {
  const context = React.useContext(InviteContext);
  if (!context) {
    throw new Error('useInviteContext must be used within an InviteProvider');
  }
  return context;
};

// Update SignInFooter to use context
const SignInFooter = () => {
  const { setShowRegistration } = useInviteContext();
  return (
    <CardFooter>
      <div className="text-center text-sm text-muted-foreground">
        No account yet?{' '}
        <button
          type="button"
          className="underline underline-offset-4 hover:text-primary cursor-pointer"
          onClick={() => setShowRegistration(true)}
        >
          Create account
        </button>
      </div>
    </CardFooter>
  );
};

const RegistrationFooter = () => {
  const { setShowRegistration } = useInviteContext();
  return (
    <CardFooter>
      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          className="underline underline-offset-4 hover:text-primary cursor-pointer"
          onClick={() => setShowRegistration(false)}
        >
          Sign in instead
        </button>
      </div>
    </CardFooter>
  );
};

const InviteBody = () => {
  const { showRegistration, inviteId } = useInviteContext();

  if (showRegistration) {
    return (
      <RegistrationRoot inviteId={inviteId}>
        <CardContent className="grid gap-4">
          <RegistrationFormFields />
          <RegistrationSubmitButton buttonText="Create account and join" />
          <RegistrationFooter />
        </CardContent>
      </RegistrationRoot>
    );
  }
  return (
    <SignInRoot inviteId={inviteId}>
      <CardContent className="grid gap-4">
        <SignInSocialProviders />
        <SignInDivider />
        <SignInForm buttonText="Login and join" />
        <SignInFooter />
      </CardContent>
    </SignInRoot>
  );
};

// Update Invite component
export const Invite = () => {
  const { inviteId } = useParams();
  const [showRegistration, setShowRegistration] = React.useState(false);

  if (!inviteId) {
    return null;
  }

  const value = {
    showRegistration,
    setShowRegistration,
    inviteId,
  };

  return (
    <InviteContext.Provider value={value}>
      <Card>
        <InviteHeader />
        <InviteBody />
      </Card>
    </InviteContext.Provider>
  );
};

Invite.displayName = 'Invite';
