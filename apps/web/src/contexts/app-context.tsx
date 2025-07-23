import { Environment, Project } from '@usertour/types';
import { UID_COOKIE } from '@usertour-packages/constants';
import {
  useGlobalConfigQuery,
  useGetUserInfoQuery,
  useLogoutMutation,
} from '@usertour-packages/shared-hooks';
import { removeAuthToken } from '@usertour/helpers';
import { GlobalConfig, TeamMemberRole, UserProfile } from '@usertour/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useCookie } from 'react-use';

interface AppContextProps {
  environment: Environment | null;
  setEnvironment: React.Dispatch<React.SetStateAction<Environment | null>>;
  project: Project | null;
  userInfo: UserProfile | null | undefined;
  setUserInfo: React.Dispatch<React.SetStateAction<UserProfile | null | undefined>>;
  refetch: any;
  handleLogout: () => Promise<void>;
  projects: Project[];
  isViewOnly: boolean;
  globalConfig: GlobalConfig | undefined;
  loading: boolean;
}

export const AppContext = createContext<AppContextProps | null>(null);

export interface AppProviderProps {
  children?: ReactNode;
}

export const AppProvider = (props: AppProviderProps) => {
  const { children } = props;
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [userInfo, setUserInfo] = useState<UserProfile | null | undefined>(undefined);
  const [uid] = useCookie(UID_COOKIE);
  const { data, refetch, loading, error } = useGetUserInfoQuery(uid || undefined);
  const { data: globalConfig } = useGlobalConfigQuery();
  const { invoke: logout } = useLogoutMutation();

  useEffect(() => {
    // Skip if still loading
    if (loading) {
      return;
    }

    // Reset user info if no uid or error occurs
    if (!uid || error || !data) {
      setUserInfo(null);
      return;
    }

    // Set user info when data is available
    setUserInfo({ ...data });
  }, [data, loading, error, uid]);

  const handleLogout = async () => {
    try {
      await logout();
      removeAuthToken();
      setUserInfo(null);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const projects: Project[] =
    data?.projects?.map((p: any) => ({
      role: p.role,
      actived: p.actived,
      ...p.project,
    })) ?? [];

  const project: Project | null = projects.find((p: Project) => p.actived) ?? null;
  const isViewOnly = !!(project && project.role === TeamMemberRole.VIEWER);

  const value = {
    environment,
    setEnvironment,
    project,
    userInfo,
    setUserInfo,
    refetch,
    handleLogout,
    projects,
    isViewOnly,
    globalConfig,
    loading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useAppContext(): AppContextProps {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within a AppProvider.');
  }
  return context;
}
