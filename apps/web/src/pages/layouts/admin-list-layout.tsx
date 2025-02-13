import { AdminLayoutNewContent, AdminNewLayout } from './components/admin-layout';
import { AdminMainNewNav } from './components/admin-main-nav';

interface AdminListLayoutProps {
  children: React.ReactNode;
}

export const AdminListLayout = ({ children }: AdminListLayoutProps) => {
  return (
    <>
      <AdminNewLayout>
        <AdminMainNewNav />
        <AdminLayoutNewContent>{children}</AdminLayoutNewContent>
      </AdminNewLayout>
    </>
  );
};

AdminListLayout.displayName = 'AdminListLayout';
