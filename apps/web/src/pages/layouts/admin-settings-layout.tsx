import { ScrollArea } from '@usertour-packages/scroll-area';
import { useParams } from 'react-router-dom';
import { AdminLayoutNewContent, AdminNewLayout } from './components/admin-layout';
import { AdminMainNewNav } from './components/admin-main-nav';
import { SettingsSidebarNav } from './components/settings-sidebar-nav';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export const AdminSettingsLayout = ({ children }: SettingsLayoutProps) => {
  const { settingType, settingSubType } = useParams();
  const bgClassName =
    settingType === 'account' || settingType === 'companies' || settingSubType ? 'bg-slate-50' : '';
  return (
    <>
      <AdminNewLayout>
        <AdminMainNewNav />
        <AdminLayoutNewContent className={bgClassName}>
          <SettingsSidebarNav />
          <ScrollArea className="h-full w-full ">
            <div className="mx-auto max-w-6xl">{children}</div>
          </ScrollArea>
        </AdminLayoutNewContent>
      </AdminNewLayout>
    </>
  );
};

AdminSettingsLayout.displayName = 'AdminSettingsLayout';
