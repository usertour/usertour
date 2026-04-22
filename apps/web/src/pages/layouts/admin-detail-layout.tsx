import { Helmet } from 'react-helmet-async';
import { AdminLayout, AdminLayoutContent } from './components/admin-layout';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminDetailLayout = ({ children }: AdminLayoutProps) => {
  return (
    <AdminLayout>
      <Helmet>
        <body className="bg-slate-100 dark:bg-background" />
      </Helmet>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminLayout>
  );
};

AdminDetailLayout.displayName = 'AdminDetailLayout';
