import { ScrollArea } from '@usertour/scroll-area';
import { Outlet, useParams } from 'react-router-dom';
import { findSettingsSection } from '@/pages/settings/registry';
import { AdminLayoutNewContent, ShellHelmet } from './components/admin-layout';
import { AdminMainNewNav } from './components/admin-main-nav';
import { SettingsSidebarNav } from './components/settings-sidebar-nav';

export const AdminSettingsLayout = () => {
  const { settingType, settingSubType } = useParams();
  // Detail sub-routes always render against the muted surface; the parent
  // section decides via `surface` for the top-level entry.
  const section = findSettingsSection(settingType);
  const surface = settingSubType || section?.surface === 'muted' ? 'muted' : 'default';
  return (
    <>
      <ShellHelmet surface={surface} />
      <div className="flex h-[100dvh] w-full">
        <AdminMainNewNav />
        <AdminLayoutNewContent surface={surface}>
          <SettingsSidebarNav />
          <ScrollArea className="h-full w-full ">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </ScrollArea>
        </AdminLayoutNewContent>
      </div>
    </>
  );
};

AdminSettingsLayout.displayName = 'AdminSettingsLayout';
