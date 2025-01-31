import { Helmet } from "react-helmet-async";
import {
  EnvironmentListProvider,
  useEnvironmentListContext,
} from "@/contexts/environment-list-context";
import { AttributeListProvider } from "@/contexts/attribute-list-context";
import { useAppContext } from "@/contexts/app-context";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { storage } from "@usertour-ui/shared-utils";
import { Button } from "@usertour-ui/button";
import { AdminMainNav } from "./admin-main-nav";
import { AdminEnvSwitcher } from "./admin-env-switcher";
import { AdminUserNav } from "./admin-user-nav";
import { usePostHog } from "posthog-js/react";
import { cn } from "@usertour-ui/ui-utils";
import usertour from "usertour.js";
import { userTourToken } from "@/utils/env";
import { window } from "@usertour-ui/shared-utils";

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
            href="https://www.usertour.io/docs/developers/usertourjs-installation/"
            target="_blank"
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

AdminLayoutHeader.displayName = "AdminLayoutHeader";

interface AdminLayoutBodyProps {
  children: React.ReactNode;
}

export const AdminLayoutContent = (props: AdminLayoutBodyProps) => {
  const { children } = props;
  const { envId } = useParams();
  const { setEnvironment } = useAppContext();

  const { environmentList } = useEnvironmentListContext();

  useEffect(() => {
    const _envId = envId || storage.getLocalStorage("environmentId");
    if (environmentList) {
      const currentEnv =
        environmentList.find((env) => env.id === _envId) || environmentList[0];
      if (currentEnv) {
        setEnvironment(currentEnv);
        storage.setLocalStorage("environmentId", currentEnv?.id);
      }
    }
  }, [envId, environmentList]);

  return <div className="flex-col md:flex">{children}</div>;
};

AdminLayoutContent.displayName = "AdminLayoutContent";

const AdminSidebarTemplate = () => {
  return (
    <div className="group peer text-foreground">
      <div className="duration-200 bg-white border-gray-200/60 dark:bg-card dark:border-border/40 dark:shadow-inner dark:shadow-black/20 inset-y-0 z-10 hidden h-svh w-[15rem] transition-[left,right,width] ease-linear md:flex left-0 border-r ">
        <div className="flex h-full w-full flex-col bg-background/10 dark:bg-background/80 ">
          <div className="pt-4 pb-[18px] min-h-[66.86px] sidebar-header gap-2 flex items-center justify-between w-full border-b border-b-gray-200/30 dark:border-b-accent/5 !pl-5 !pr-3 bg-gradient-to-br dark:from-primary-modified/[6%] dark:to-transparent !text-[17px] text-gray-600 dark:text-gray-200">
            <h2>Feedback</h2>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-auto custom-scrollbar">
            <div className="relative flex w-full min-w-0 flex-col p-2 px-3">
              <div className="duration-200 flex pointer-events-none h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium dark:text-foreground/70 text-foreground/80 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 ">
                Status
              </div>
              <button className="inline-flex main-transition whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent shadow-none select-none focus:!ring-0 dark:foucs:!ring-0 focus:outline-none dark:shadow-none items-center !text-[13px] w-full hover:bg-gray-200/40 dark:hover:bg-secondary/60 !text-foreground hover:!text-gray-600 dark:!text-foreground dark:hover:!text-dark-accent-foreground h-8 rounded-md px-2 text-xs justify-start">
                Under Review
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative flex w-full min-w-0 flex-col p-2 px-3">
              <div className="duration-200 flex pointer-events-none h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium dark:text-foreground/70 text-foreground/80 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 ">
                Resources
              </div>
              <a
                target="_blank"
                href="https://help.featurebase.app/collections/3118494-in-app-widgets-and-embeds"
              >
                <button className="inline-flex main-transition whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent shadow-none select-none focus:!ring-0 dark:foucs:!ring-0 focus:outline-none dark:shadow-none items-center !text-[13px] w-full hover:bg-gray-200/40 dark:hover:bg-secondary/60 !text-foreground hover:!text-gray-600 dark:!text-foreground dark:hover:!text-dark-accent-foreground h-8 rounded-md px-2 text-xs justify-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="secondary-svg mr-2"
                  >
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z"></path>
                  </svg>
                  Install Widget &amp; Embed
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    const _envId = envId || storage.getLocalStorage("environmentId");
    if (environmentList) {
      const currentEnv =
        environmentList.find((env) => env.id === _envId) || environmentList[0];
      if (currentEnv) {
        setEnvironment(currentEnv);
        storage.setLocalStorage("environmentId", currentEnv?.id);
      }
    }
  }, [envId, environmentList]);

  return (
    <div className="py-1.5 pr-1.5 w-full min-w-0 flex-shrink">
      <div
        className={cn(
          "w-full min-w-0 overflow-hidden  flex relative rounded-md border border-border bg-white h-full dark:border-border/60 dark:bg-card/60",
          className
        )}
      >
        <div className="group/sidebar-wrapper flex h-full w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

AdminLayoutNewContent.displayName = "AdminLayoutNewContent";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Add new custom hook
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
      posthog?.group("company", userInfo.projectId);
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
                type == "builder"
                  ? "bg-[url(/images/grid--light.svg)] dark:bg-[url(/images/grid--dark.svg)]"
                  : "bg-slate-100"
              }
            />
          </Helmet>
          {children}
        </AttributeListProvider>
      </EnvironmentListProvider>
    </>
  );
};

AdminLayout.displayName = "AdminLayout";

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
                type == "builder"
                  ? "bg-[url(/images/grid--light.svg)] dark:bg-[url(/images/grid--dark.svg)]"
                  : "bg-slate-100"
              }
            />
          </Helmet>
          <div className="flex h-[100dvh] w-full">{children}</div>
        </AttributeListProvider>
      </EnvironmentListProvider>
    </>
  );
};

AdminNewLayout.displayName = "AdminNewLayout";
