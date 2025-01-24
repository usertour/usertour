import { AdminLayout, AdminLayoutContent } from "./components/admin-layout";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminDetailLayout = ({ children }: AdminLayoutProps) => {
  return (
    <>
      <AdminLayout>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </AdminLayout>
    </>
  );
};

AdminDetailLayout.displayName = "AdminDetailLayout";
