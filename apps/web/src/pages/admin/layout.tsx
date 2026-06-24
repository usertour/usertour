import { ScrollArea } from '@usertour/ui';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminLayoutNewContent, ShellHelmet } from '@/pages/layouts/components/admin-layout';
import { AdminMainNewNav } from '@/pages/layouts/components/admin-main-nav';
import { AdminPanelSidebarNav, getAdminSurface } from './components/admin-sidebar-nav';
import { SystemAdminGuard } from './components/system-admin-guard';

export const SystemAdminLayout = () => {
  // Card-stack admin pages (general / authentication) render on the muted
  // surface so their cards float; list/table pages stay on the default.
  const { pathname } = useLocation();
  const surface = getAdminSurface(pathname);
  return (
    <SystemAdminGuard>
      <ShellHelmet surface={surface} />
      <div className="flex h-[100dvh] w-full">
        <AdminMainNewNav />
        <AdminLayoutNewContent surface={surface}>
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
