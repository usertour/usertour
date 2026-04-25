import { AdminLayoutNewContent, AdminNewLayout } from './components/admin-layout';
import { AdminMainNewNav } from './components/admin-main-nav';

interface AdminSubpageLayoutProps {
  children: React.ReactNode;
}

export const AdminSubpageLayout = ({ children }: AdminSubpageLayoutProps) => {
  return (
    <>
      <AdminNewLayout>
        <AdminMainNewNav />
        <AdminLayoutNewContent surface="muted">{children}</AdminLayoutNewContent>
      </AdminNewLayout>
    </>
  );
};

AdminSubpageLayout.displayName = 'AdminSubpageLayout';
