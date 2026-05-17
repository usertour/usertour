import { Outlet } from 'react-router-dom';
import { AdminLayoutNewContent, ShellHelmet } from './components/admin-layout';
import { AdminLayoutSurface } from './components/admin-surface';
import { AdminMainNewNav } from './components/admin-main-nav';

interface AdminShellProps {
  surface?: Extract<AdminLayoutSurface, 'default' | 'muted'>;
}

export const AdminShell = ({ surface = 'default' }: AdminShellProps) => {
  return (
    <>
      <ShellHelmet surface={surface} />
      <div className="flex h-[100dvh] w-full">
        <AdminMainNewNav />
        <AdminLayoutNewContent surface={surface}>
          <Outlet />
        </AdminLayoutNewContent>
      </div>
    </>
  );
};

AdminShell.displayName = 'AdminShell';

export const AdminShellMuted = () => <AdminShell surface="muted" />;
AdminShellMuted.displayName = 'AdminShellMuted';
