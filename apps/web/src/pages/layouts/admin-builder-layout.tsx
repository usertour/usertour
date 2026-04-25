import { AdminLayout, AdminLayoutContent } from './components/admin-layout';

interface AdminBuilderLayoutProps {
  children: React.ReactNode;
}

export const AdminBuilderLayout = ({ children }: AdminBuilderLayoutProps) => {
  return (
    <AdminLayout surface="canvas">
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminLayout>
  );
};

AdminBuilderLayout.displayName = 'AdminBuilderLayout';
