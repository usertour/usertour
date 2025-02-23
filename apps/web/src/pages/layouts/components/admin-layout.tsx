import { useAppContext } from '@/contexts/app-context';
import { AttributeListProvider } from '@/contexts/attribute-list-context';
import {
  EnvironmentListProvider,
  useEnvironmentListContext,
} from '@/contexts/environment-list-context';
import { userTourToken } from '@/utils/env';
import { Button } from '@usertour-ui/button';
import { storage } from '@usertour-ui/shared-utils';
import { cn } from '@usertour-ui/ui-utils';
import { usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import usertour from 'usertour.js';
import { AdminEnvSwitcher } from './admin-env-switcher';
import { AdminMainNav } from './admin-main-nav';
import { AdminUserNav } from './admin-user-nav';

export const AdminLayoutHeader = () => {
  return (
    <div className="border-b bg-white">
      <div className="flex h-16 items-center px-4">
        <div className="pl-2 pr-10 flex-none">
          <img
            src="/images/logo.svg"
            alt="Usertour logo"
            width={120}
            // height={32}
            loading="eager"
          />
        </div>
        {/* <EnvSwitcher /> */}
        <AdminMainNav className="mx-6" />
        <div className="ml-auto flex items-center space-x-4">
          <a
            href="https://docs.usertour.io/developers/usertourjs-installation/"
            target="_blank"
            rel="noreferrer"
          >
            <Button className="bg-gradient-to-r from-sky-100 to-sky-200 space-x-2 text-foreground">
              <img
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAwNJREFUOE+NlUlrFFEUhc+5r7szdLUTthp147QJCv4CF85GxQHRhdiicZmFGxFcuHBjBFEUJxyCAyJEDaImEIfkNzhtREVEkmhESVe16cSkrrx+Vg9pJRY0RVfd993zzr33FRtfa+LL29wxQDMQbaAA5T9QQSHsXYx7Fz0rxhn2k+HN+tqpRzn9btCqGh62L8W4hZWL3H8LpShAG2ehpcRRMiNygtPu+H0QNESgiQqrFTnFDl6ZjMJ+TrntawSBKEgXXHxW2GpJefX2yy1SMHXLAqOsAIk8jbaIkSmK8JSzAjlD2T5uwtUEDonRgwQDCM5DtKZivXfD15InzJs4tn7f4XWnH+WXjP8afWsVicH9wc2pHbO6grVg2F0biy/6tKbuw/zeYH2o4QMarSl66l0PIoV5EFuzu73u2R3+rNEx9NKg0fpkjGke3JJsSz8OWim2gHwDYuWXdamvFqoIH1ilBWj9NeehiDT7e5NtFjYyil6FNkbembiZ921Lsi/90H+pDJdZ1cbwjf6Bzn2e3QfRNge8aoGExHjAzySvzWnX9PBY0ANiaaEwxIsfO1PL5z/6OW94fOxzWRe8Eo+rBlakBuc+yzYrcbXgZd1lBwQxEotzezaT7HLQXA+oSyE8PrTLOzLjfvYAiCuujfgqHseqgabU4JwnQ01Q6YCEbsu1l4I/RbGVlhETQwE69fbwQsXY+1ica7/v9J5Oa/c7xGCb9TRRF18wsKHu48zHQxuF0kGjieL01F4MtHK8ZEQMWkj1lHpahCfFsAei9xRhfcHvGFtENK/gBYqDFXu15rwFVs5vqa/cqE2c7VKjl4agGJc4m+uj0YbSjFbPa9Sn5UoiaLSukNQeEomzP1tBPfzvWa5WWT6W0cHhkskJNrZr4t3A8DFSM0ptcGrKZ7nyFKqG2R5mvwhvphcnjxL/cSXbXOFy+1KTxk8aYPNFzZ/b700a/9eAmnO5TlCbKrdnK+rssAUh0ZXd422cuMG/AhNncp0QBywd91H1o88BO/2Mt2ki8DehYzQb4yma+QAAAABJRU5ErkJggg=="
                alt=""
              />
              <span className="min-w-28	">Install to publish</span>
            </Button>
          </a>
          {/* <Search /> */}
          <AdminEnvSwitcher />
          <AdminUserNav />
        </div>
      </div>
    </div>
  );
};

AdminLayoutHeader.displayName = 'AdminLayoutHeader';

interface AdminLayoutBodyProps {
  children: React.ReactNode;
}

export const AdminLayoutContent = (props: AdminLayoutBodyProps) => {
  const { children } = props;
  const { envId } = useParams();
  const { setEnvironment } = useAppContext();

  const { environmentList } = useEnvironmentListContext();

  useEffect(() => {
    const _envId = envId || storage.getLocalStorage('environmentId');
    if (environmentList) {
      const currentEnv = environmentList.find((env) => env.id === _envId) || environmentList[0];
      if (currentEnv) {
        setEnvironment(currentEnv);
        storage.setLocalStorage('environmentId', currentEnv?.id);
      }
    }
  }, [envId, environmentList, setEnvironment]);

  return <div className="flex-col md:flex">{children}</div>;
};

AdminLayoutContent.displayName = 'AdminLayoutContent';

interface AdminLayoutNewContentProps {
  children: React.ReactNode;
  className?: string;
}

export const AdminLayoutNewContent = (props: AdminLayoutNewContentProps) => {
  const { children, className } = props;
  const { envId } = useParams();
  const { setEnvironment } = useAppContext();

  const { environmentList } = useEnvironmentListContext();

  useEffect(() => {
    const _envId = envId || storage.getLocalStorage('environmentId');
    if (environmentList) {
      const currentEnv = environmentList.find((env) => env.id === _envId) || environmentList[0];
      if (currentEnv) {
        setEnvironment(currentEnv);
        storage.setLocalStorage('environmentId', currentEnv?.id);
      }
    }
  }, [envId, environmentList, setEnvironment]);

  return (
    <div className="py-1.5 pr-1.5 w-full min-w-0 flex-shrink">
      <div
        className={cn(
          'w-full min-w-0 overflow-hidden  flex relative rounded-md border border-border bg-white h-full dark:border-border/60 dark:bg-card/60',
          className,
        )}
      >
        <div className="group/sidebar-wrapper flex h-full w-full">{children}</div>
      </div>
    </div>
  );
};

AdminLayoutNewContent.displayName = 'AdminLayoutNewContent';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Add new custom hook
//biome-ignore lint/suspicious/noExplicitAny: <explanation>
const useUserTracking = (userInfo: any) => {
  const posthog = usePostHog();

  useEffect(() => {
    if (!userInfo || !userInfo.id) {
      return;
    }
    usertour.init(userTourToken);
    usertour.identify(`${userInfo.id}`, {
      name: userInfo?.name,
      email: userInfo?.email,
      signed_up_at: userInfo.createdAt,
    });
    posthog?.identify(userInfo.id, {
      email: userInfo.email,
    });
    if (userInfo.projectId) {
      posthog?.group('company', userInfo.projectId);
    }
  }, [userInfo, posthog]);
};

export const AdminLayout = (props: AdminLayoutProps) => {
  const { children } = props;
  const { project, userInfo } = useAppContext();
  const { type } = useParams();

  useUserTracking(userInfo);

  return (
    <>
      <EnvironmentListProvider projectId={project?.id}>
        <AttributeListProvider projectId={project?.id}>
          <Helmet>
            <title>Usertour App</title>
            <body
              className={
                type === 'builder'
                  ? 'bg-[url(/images/grid--light.svg)] dark:bg-[url(/images/grid--dark.svg)]'
                  : 'bg-slate-100'
              }
            />
          </Helmet>
          {children}
        </AttributeListProvider>
      </EnvironmentListProvider>
    </>
  );
};

AdminLayout.displayName = 'AdminLayout';

export const AdminNewLayout = (props: AdminLayoutProps) => {
  const { children } = props;
  const { project, userInfo } = useAppContext();
  const { type } = useParams();

  useUserTracking(userInfo);

  return (
    <>
      <EnvironmentListProvider projectId={project?.id}>
        <AttributeListProvider projectId={project?.id}>
          <Helmet>
            <title>Usertour App</title>
            <body
              className={
                type === 'builder'
                  ? 'bg-[url(/images/grid--light.svg)] dark:bg-[url(/images/grid--dark.svg)]'
                  : 'bg-slate-100'
              }
            />
          </Helmet>
          <div className="flex h-[100dvh] w-full">{children}</div>
        </AttributeListProvider>
      </EnvironmentListProvider>
    </>
  );
};

AdminNewLayout.displayName = 'AdminNewLayout';
