import { ScrollArea } from '@usertour-packages/scroll-area';
import { AdminLayoutNewContent, AdminNewLayout } from '@/pages/layouts/components/admin-layout';
import { AdminMainNewNav } from '@/pages/layouts/components/admin-main-nav';
import { AdminPanelSidebarNav } from './components/admin-sidebar-nav';
import { SystemAdminGuard } from './components/system-admin-guard';

interface SystemAdminLayoutProps {
  children: React.ReactNode;
}

export const SystemAdminLayout = ({ children }: SystemAdminLayoutProps) => {
  return (
    <SystemAdminGuard>
      <AdminNewLayout>
        <AdminMainNewNav />
        <AdminLayoutNewContent>
          <AdminPanelSidebarNav />
          <ScrollArea className="h-full w-full">
            <div className="mx-auto max-w-6xl">{children}</div>
          </ScrollArea>
        </AdminLayoutNewContent>
      </AdminNewLayout>
    </SystemAdminGuard>
  );
};

SystemAdminLayout.displayName = 'SystemAdminLayout';
