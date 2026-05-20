import { Environment, Project } from '@usertour/types';
import {
  useCurrentUserId,
  useGlobalConfigQuery,
  useGetUserInfoQuery,
  useLogoutMutation,
} from '@usertour/hooks';
import { removeAuthToken } from '@usertour/helpers';
import { GlobalConfig, TeamMemberRole, UserProfile } from '@usertour/types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { broadcastAuthSwitch } from '@/utils/auth-channel';

interface AppContextProps {
  environment: Environment | null;
  setEnvironment: React.Dispatch<React.SetStateAction<Environment | null>>;
  project: Project | null;
  userInfo: UserProfile | null | undefined;
  setUserInfo: React.Dispatch<React.SetStateAction<UserProfile | null | undefined>>;
  refetch: any;
  handleLogout: () => Promise<void>;
  signOutAndRedirect: (to?: string) => Promise<void>;
  projects: Project[];
  isViewOnly: boolean;
  globalConfig: GlobalConfig | undefined;
  globalConfigLoading: boolean;
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
  const uid = useCurrentUserId();
  const { data, refetch, loading, error } = useGetUserInfoQuery(uid || undefined);
  const { data: globalConfig, loading: globalConfigLoading } = useGlobalConfigQuery();
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
      broadcastAuthSwitch();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // "Log out and leave" — tears down the session, then hard-loads `to`.
  // Deliberately does NOT setUserInfo(null): on a protected route that would
  // re-render AuthGuard, which fires a client-side <Navigate to=signin?next=>
  // that flashes before the reload lands. The full reload re-bootstraps
  // AppContext from the now-cleared cookies, so the in-place state reset is
  // both unnecessary and the cause of the flash. Use handleLogout instead when
  // staying in the SPA without a reload (e.g. the password-reset success card).
  const signOutAndRedirect = async (to = '/auth/signin') => {
    try {
      await logout();
      removeAuthToken();
      broadcastAuthSwitch();
    } catch (error) {
      console.error('Logout failed', error);
    }
    window.location.assign(to);
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
    signOutAndRedirect,
    projects,
    isViewOnly,
    globalConfig,
    globalConfigLoading,
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
