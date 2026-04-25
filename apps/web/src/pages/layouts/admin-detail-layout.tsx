import { AdminLayout, AdminLayoutContent } from './components/admin-layout';

interface AdminDetailLayoutProps {
  children: React.ReactNode;
}

export const AdminDetailLayout = ({ children }: AdminDetailLayoutProps) => {
  return (
    <AdminLayout surface="muted">
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminLayout>
  );
};

AdminDetailLayout.displayName = 'AdminDetailLayout';
