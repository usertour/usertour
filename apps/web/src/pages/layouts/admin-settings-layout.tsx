import { ScrollArea } from '@usertour/scroll-area';
import { Outlet, useParams } from 'react-router-dom';
import { AdminLayoutNewContent, ShellHelmet } from './components/admin-layout';
import { AdminMainNewNav } from './components/admin-main-nav';
import { SettingsSidebarNav } from './components/settings-sidebar-nav';

export const AdminSettingsLayout = () => {
  const { settingType, settingSubType } = useParams();
  const isMutedSurface = settingType === 'account' || settingType === 'general' || !!settingSubType;
  const surface = isMutedSurface ? 'muted' : 'default';
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
