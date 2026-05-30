import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentSelection } from '@/hooks/use-environment-selection';
import { userTourToken } from '@/utils/env';
import { cn } from '@usertour/tailwind';
import { UserProfile } from '@usertour/types';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import usertour from 'usertour.js';
import { AdminLayoutSurface, SURFACE_BODY_CLASSNAMES } from './admin-surface';
import { UpgradePlanBanner } from './upgrade-plan-banner';

interface AdminLayoutBodyProps {
  children: React.ReactNode;
}

export const AdminLayoutContent = (props: AdminLayoutBodyProps) => {
  const { children } = props;
  useEnvironmentSelection();

  return <div className="flex-col md:flex">{children}</div>;
};

AdminLayoutContent.displayName = 'AdminLayoutContent';

interface AdminLayoutNewContentProps {
  children: React.ReactNode;
  className?: string;
  surface?: 'default' | 'muted';
}

export const AdminLayoutNewContent = (props: AdminLayoutNewContentProps) => {
  const { children, className, surface = 'default' } = props;
  const { settingType } = useParams<{ settingType?: string }>();
  const { isNonPrimary } = useEnvironmentSelection();
  const { environment } = useAppContext();

  // On Settings pages: only show warning on API or Environments page when environment is non-primary
  // On other pages: show warning whenever environment is non-primary
  const isSettingsPage = !!settingType;
  const shouldShowWarning = isSettingsPage
    ? (settingType === 'api' || settingType === 'environments') && isNonPrimary
    : isNonPrimary;

  const surfaceClassName =
    surface === 'muted' ? 'bg-slate-100 dark:bg-background' : 'bg-white dark:bg-card/60';

  return (
    <div className="py-1.5 pr-1.5 w-full min-w-0 flex-shrink">
      <div
        className={cn(
          'w-full min-w-0 overflow-hidden flex relative rounded-xl border border-border h-full dark:border-border/60',
          surfaceClassName,
          shouldShowWarning &&
            'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-warning before:z-20 dark:before:bg-warning',
          className,
        )}
      >
        {shouldShowWarning && environment?.name && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 inline-flex items-center justify-center rounded-b-md rounded-t-none border-0 bg-warning text-white px-3 pt-0 py-0.5 text-xs leading-none">
            {environment.name}
          </div>
        )}
        <div className="group/sidebar-wrapper flex h-full w-full">{children}</div>
      </div>
    </div>
  );
};

AdminLayoutNewContent.displayName = 'AdminLayoutNewContent';

const useUserTracking = (userInfo: UserProfile | null | undefined) => {
  const posthog = usePostHog();
  const usertourInitialized = useRef(false);

  useEffect(() => {
    if (!userInfo?.id) {
      return;
    }
    if (userTourToken && !usertourInitialized.current) {
      usertour.init(userTourToken);
      usertour.identify(`${userInfo.id}`, {
        name: userInfo?.name,
        email: userInfo?.email,
        signed_up_at: userInfo.createdAt,
      });
      usertourInitialized.current = true;
    }
    posthog?.identify(userInfo.id, {
      email: userInfo.email,
    });
    if (userInfo.projectId) {
      posthog?.group('company', userInfo.projectId);
    }
  }, [userInfo, posthog]);
};

// Outlet for the admin shell. Environment / subscription / event /
// attribute / theme lists are all hook-based now (`useEnvironmentList`,
// `useSubscription`, `useEventList`, `useAttributeList`, `useThemeList`)
// — they dedupe via Apollo's shared cache without needing a Provider
// at this layer. `packages/contexts/.../{attribute,theme}-list-context`
// still exists for `packages/builder` consumers; v0.8.6 retires those.
export const AdminProvidersOutlet = () => {
  const { project, userInfo } = useAppContext();
  useUserTracking(userInfo);
  const projectId = project?.id;

  // No active project — either the user has zero memberships or none of
  // their existing memberships is `actived`. Send them to /select-project
  // so they can pick one (or create a new one if they have none).
  if (!projectId) {
    return <Navigate to="/select-project" replace />;
  }

  return (
    <>
      <UpgradePlanBanner projectId={projectId} />
      <Outlet />
    </>
  );
};

AdminProvidersOutlet.displayName = 'AdminProvidersOutlet';

// Sets the document body surface class for a leaf route's shell.
export const ShellHelmet = ({ surface }: { surface: AdminLayoutSurface }) => (
  <Helmet>
    <title>Usertour App</title>
    <body className={SURFACE_BODY_CLASSNAMES[surface]} />
  </Helmet>
);

ShellHelmet.displayName = 'ShellHelmet';
