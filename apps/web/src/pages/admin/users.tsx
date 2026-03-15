import {
  useAdminUsersQuery,
  useUpdateUserSystemAdminMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { SettingsContent } from '@/pages/settings/components/content';
import { Switch } from '@usertour-packages/switch';

export const AdminUsersPage = () => {
  const { data: users, loading, refetch } = useAdminUsersQuery();
  const { invoke: updateSystemAdmin } = useUpdateUserSystemAdminMutation();
  const { toast } = useToast();

  const handleToggleAdmin = async (userId: string, isSystemAdmin: boolean) => {
    try {
      await updateSystemAdmin(userId, isSystemAdmin);
      toast({ title: `User ${isSystemAdmin ? 'granted' : 'revoked'} system admin` });
      refetch();
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update user' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col grow space-y-8 py-8">
        <SettingsContent className="min-w-[750px] max-w-3xl shadow-sm border border-border rounded mx-auto bg-background">
          <div className="text-muted-foreground">Loading...</div>
        </SettingsContent>
      </div>
    );
  }

  return (
    <div className="flex flex-col grow space-y-8 py-8">
      <SettingsContent className="min-w-[750px] max-w-3xl shadow-sm border border-border rounded mx-auto bg-background">
        <h3 className="text-lg font-medium">Users</h3>
        <div className="mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Created</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                  Projects
                </th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                  System Admin
                </th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user: any) => (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="py-3 px-2">{user.name || '-'}</td>
                  <td className="py-3 px-2">{user.email || '-'}</td>
                  <td className="py-3 px-2">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-2 text-center">{user.projectCount}</td>
                  <td className="py-3 px-2 text-center">
                    <Switch
                      checked={user.isSystemAdmin}
                      onCheckedChange={(checked: boolean) => handleToggleAdmin(user.id, checked)}
                    />
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SettingsContent>
    </div>
  );
};

AdminUsersPage.displayName = 'AdminUsersPage';
