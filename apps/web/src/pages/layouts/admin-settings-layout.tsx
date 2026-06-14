import { ScrollArea } from '@usertour/ui';
import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { ScrollRootProvider } from '@/contexts/scroll-root-context';
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
  // Publish the ScrollArea Viewport so infinite-scroll settings pages (e.g.
  // the audit log) can register it as the IntersectionObserver root.
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <ShellHelmet surface={surface} />
      <div className="flex h-[100dvh] w-full">
        <AdminMainNewNav />
        <AdminLayoutNewContent surface={surface}>
          <SettingsSidebarNav />
          <ScrollArea className="h-full w-full " viewportRef={setScrollRoot}>
            <ScrollRootProvider value={scrollRoot}>
              <div className="mx-auto max-w-6xl">
                <Outlet />
              </div>
            </ScrollRootProvider>
          </ScrollArea>
        </AdminLayoutNewContent>
      </div>
    </>
  );
};

AdminSettingsLayout.displayName = 'AdminSettingsLayout';
