import { Environment } from '@usertour/types';
import { Capability, GlobalConfig, type Project, UserProfile } from '@usertour/types';
import { ReactNode, createContext, useContext, useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useActiveProject, useUserProjects } from '@/hooks/use-active-project';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useGlobalConfig } from '@/hooks/use-global-config';
import { useLogout } from '@/hooks/use-logout';

// AppContext is a thin facade over the underlying focused hooks
// (`useCurrentUser`, `useActiveProject`, `useCapabilities`,
// `useGlobalConfig`, `useLogout`). Everything except `environment` is
// derived from Apollo cache + URL — no `useState` mirrors of server
// data, no `useEffect` to sync them.
//
// New code should prefer the focused hooks directly; AppContext stays
// as a convenience aggregator so the ~50 existing call sites don't all
// need to churn at once.
//
// `environment` deliberately stays in `useState` here — its selection
// logic (URL → localStorage → primary → first) lives in
// `useEnvironmentSelection`, which dispatches via `setEnvironment`.
// That's coordinated UI state, not server data.

interface AppContextProps {
  environment: Environment | null;
  setEnvironment: React.Dispatch<React.SetStateAction<Environment | null>>;
  project: Project | null;
  userInfo: UserProfile | null | undefined;
  refetch: () => Promise<unknown>;
  handleLogout: () => Promise<void>;
  signOutAndRedirect: (to?: string) => Promise<void>;
  projects: Project[];
  isViewOnly: boolean;
  /** Capabilities the current user holds on the active project. */
  capabilities: Capability[];
  /** Whether the active-project role grants a capability. */
  can: (capability: Capability) => boolean;
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

  const { userInfo, loading, refetch } = useCurrentUser();
  const projects = useUserProjects();
  const project = useActiveProject();
  const { capabilities, can, isViewOnly } = useCapabilities();
  const { globalConfig, globalConfigLoading } = useGlobalConfig();
  const { handleLogout, signOutAndRedirect } = useLogout();

  const value: AppContextProps = {
    environment,
    setEnvironment,
    project,
    userInfo,
    refetch,
    handleLogout,
    signOutAndRedirect,
    projects,
    isViewOnly,
    capabilities,
    can,
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
