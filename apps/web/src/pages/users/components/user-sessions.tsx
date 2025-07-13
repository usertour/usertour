import { UserSessionsProvider } from '@/contexts/user-sessions-context';
import { UserSessionsList } from './user-sessions-list';

interface UserSessionsProps {
  environmentId: string;
  externalUserId: string;
}

export const UserSessions = ({ environmentId, externalUserId }: UserSessionsProps) => {
  return (
    <UserSessionsProvider environmentId={environmentId} externalUserId={externalUserId}>
      <UserSessionsList />
    </UserSessionsProvider>
  );
};

UserSessions.displayName = 'UserSessions';
