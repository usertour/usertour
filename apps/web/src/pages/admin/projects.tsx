import {
  useAdminProjectsQuery,
  useAdminUsersQuery,
  useAdminCreateProjectMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { SettingsContent } from '@/pages/settings/components/content';
import { Button } from '@usertour-packages/button';
import { Badge } from '@usertour-packages/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@usertour-packages/dialog';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';

const LicenseSourceBadge = ({ source }: { source: string }) => {
  switch (source) {
    case 'project':
      return <Badge variant="outline">Project</Badge>;
    case 'instance':
      return <Badge className="bg-blue-600 hover:bg-blue-700">Instance</Badge>;
    default:
      return <Badge variant="secondary">None</Badge>;
  }
};

export const AdminProjectsPage = () => {
  const { data: projects, loading, refetch } = useAdminProjectsQuery();
  const { data: users } = useAdminUsersQuery();
  const { invoke: createProject, loading: creating } = useAdminCreateProjectMutation();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');

  const handleCreateProject = async () => {
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      toast({ variant: 'destructive', title: 'Please enter a project name' });
      return;
    }
    if (!ownerUserId) {
      toast({ variant: 'destructive', title: 'Please select an owner' });
      return;
    }
    try {
      await createProject(trimmedName, ownerUserId);
      toast({ title: 'Project created successfully' });
      setProjectName('');
      setOwnerUserId('');
      setDialogOpen(false);
      refetch();
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create project' });
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Projects</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner">Owner</Label>
                  <Select value={ownerUserId} onValueChange={setOwnerUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email || user.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Owner</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Created</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground">Members</th>
                <th className="text-center py-3 px-2 font-medium text-muted-foreground">License</th>
              </tr>
            </thead>
            <tbody>
              {projects?.map((project: any) => (
                <tr key={project.id} className="border-b last:border-b-0">
                  <td className="py-3 px-2">{project.name}</td>
                  <td className="py-3 px-2">
                    <div>{project.ownerName || '-'}</div>
                    {project.ownerEmail && (
                      <div className="text-xs text-muted-foreground">{project.ownerEmail}</div>
                    )}
                  </td>
                  <td className="py-3 px-2">{new Date(project.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-2 text-center">{project.memberCount}</td>
                  <td className="py-3 px-2 text-center">
                    <LicenseSourceBadge source={project.licenseSource} />
                  </td>
                </tr>
              ))}
              {(!projects || projects.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No projects found.
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

AdminProjectsPage.displayName = 'AdminProjectsPage';
