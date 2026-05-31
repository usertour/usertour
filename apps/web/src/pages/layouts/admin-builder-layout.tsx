import { Outlet } from 'react-router-dom';
import { useEnvironmentSelection } from '@/hooks/use-environment-selection';
import { ShellHelmet } from './components/admin-layout';

// Cold-loading the builder URL directly (URL bar / refresh / external
// link) needs `useEnvironmentSelection` to read `:envId` from the URL
// and dispatch `setEnvironment` — without it, `AppContext.environment`
// stays null and `ContentBuilder`'s gate (`!environment` →
// `<ContentLoading />`) sticks forever. SPA navigations from the
// detail page were fine because `AdminLayoutContent` already ran the
// hook; this layout was missed in the original split.
export const AdminBuilderLayout = () => {
  useEnvironmentSelection();
  return (
    <>
      <ShellHelmet surface="canvas" />
      <div className="flex-col md:flex">
        <Outlet />
      </div>
    </>
  );
};

AdminBuilderLayout.displayName = 'AdminBuilderLayout';
