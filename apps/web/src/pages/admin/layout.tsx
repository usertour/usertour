import { ScrollArea } from '@usertour-packages/scroll-area';
import { AdminPanelSidebarNav } from './components/admin-sidebar-nav';
import { SystemAdminGuard } from './components/system-admin-guard';

interface SystemAdminLayoutProps {
  children: React.ReactNode;
}

export const SystemAdminLayout = ({ children }: SystemAdminLayoutProps) => {
  return (
    <SystemAdminGuard>
      <div className="flex h-[100dvh] w-full bg-slate-100">
        <div className="py-1.5 pr-1.5 pl-1.5 w-full min-w-0 flex-shrink">
          <div className="w-full min-w-0 overflow-hidden flex relative rounded-md border border-border bg-white h-full dark:border-border/60 dark:bg-card/60">
            <div className="group/sidebar-wrapper flex h-full w-full">
              <AdminPanelSidebarNav />
              <ScrollArea className="h-full w-full">
                <div className="mx-auto max-w-6xl">{children}</div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </SystemAdminGuard>
  );
};

SystemAdminLayout.displayName = 'SystemAdminLayout';
