import { ScrollArea } from '@usertour/ui';
import { Outlet } from 'react-router-dom';
import { AdminLayoutNewContent, ShellHelmet } from '@/pages/layouts/components/admin-layout';
import { AdminMainNewNav } from '@/pages/layouts/components/admin-main-nav';
import { AdminPanelSidebarNav } from './components/admin-sidebar-nav';
import { SystemAdminGuard } from './components/system-admin-guard';

export const SystemAdminLayout = () => {
  return (
    <SystemAdminGuard>
      <ShellHelmet surface="default" />
      <div className="flex h-[100dvh] w-full">
        <AdminMainNewNav />
        <AdminLayoutNewContent>
          <AdminPanelSidebarNav />
          <ScrollArea className="h-full w-full">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </ScrollArea>
        </AdminLayoutNewContent>
      </div>
    </SystemAdminGuard>
  );
};

SystemAdminLayout.displayName = 'SystemAdminLayout';
