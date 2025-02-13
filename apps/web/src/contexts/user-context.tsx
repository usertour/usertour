import { Project } from '@/types/project';
import { ApolloError, useQuery } from '@apollo/client';
import { getUserInfo } from '@usertour-ui/gql';
import { removeAuthToken } from '@usertour-ui/shared-utils';
import { UserProfile } from '@usertour-ui/types';
import { ReactNode, createContext, useContext } from 'react';

export interface UserProviderProps {
  children: ReactNode;
}

export interface UserContextValue {
  userInfo: UserProfile | null;
  currentProject: Project | null;
  refetch: any;
  logout: () => void;
  error: ApolloError | undefined;
}

export const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider(props: UserProviderProps): JSX.Element {
  const { children } = props;

  const { data, refetch, error } = useQuery(getUserInfo);

  let userInfo: UserProfile | null = data?.me ? data.me : null;
  const activedProjects = data?.me?.projects.filter((p: any) => {
    return p.actived === true;
  });
  const currentProject: Project = activedProjects
    ? {
        role: activedProjects[0].role,
        actived: activedProjects[0]?.actived,
        ...activedProjects[0]?.project,
      }
    : null;

  const logout = () => {
    removeAuthToken();
    userInfo = null;
  };

  const value: UserContextValue = {
    currentProject,
    userInfo,
    refetch,
    logout,
    error,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider.');
  }
  return context;
}
