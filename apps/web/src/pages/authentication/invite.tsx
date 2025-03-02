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
import { RegistrationForm, RegistrationRoot } from './components/registration-form';
import React from 'react';

const InviteHeader = ({ inviteId }: { inviteId: string }) => {
  const { data } = useGetInviteQuery(inviteId as string);
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
        <a
          className="underline underline-offset-4 hover:text-primary cursor-pointer"
          onClick={() => setShowRegistration(true)}
        >
          Create account
        </a>
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
        <a
          className="underline underline-offset-4 hover:text-primary cursor-pointer"
          onClick={() => setShowRegistration(false)}
        >
          Sign in instead
        </a>
      </div>
    </CardFooter>
  );
};

const InviteBody = () => {
  const { showRegistration } = useInviteContext();
  if (showRegistration) {
    return (
      <RegistrationRoot hideCompanyName={true}>
        <CardContent className="grid gap-4">
          <RegistrationForm />
          <RegistrationFooter />
        </CardContent>
      </RegistrationRoot>
    );
  }
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

// Update Invite component
export const Invite = () => {
  const { inviteId } = useParams();
  const [showRegistration, setShowRegistration] = React.useState(false);

  return (
    <InviteContext.Provider value={{ showRegistration, setShowRegistration }}>
      <Card>
        <InviteHeader inviteId={inviteId as string} />
        <InviteBody />
      </Card>
    </InviteContext.Provider>
  );
};

Invite.displayName = 'Invite';
