import { Outlet } from 'react-router-dom';
import { ShellHelmet } from './components/admin-layout';

export const AdminBuilderLayout = () => (
  <>
    <ShellHelmet surface="canvas" />
    <div className="flex-col md:flex">
      <Outlet />
    </div>
  </>
);

AdminBuilderLayout.displayName = 'AdminBuilderLayout';
