import {
  useAdminProjectsQuery,
  useAdminUsersQuery,
  useAdminCreateProjectMutation,
  useAdminProjectMembersQuery,
  useAdminAddProjectMemberMutation,
  useAdminChangeProjectMemberRoleMutation,
  useAdminTransferProjectOwnershipMutation,
  useAdminRemoveProjectMemberMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { useState, useCallback } from 'react';
import { SettingsContent } from '@/pages/settings/components/content';
import { Separator } from '@usertour-packages/separator';
import { Button } from '@usertour-packages/button';
import { Badge } from '@usertour-packages/badge';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@usertour-packages/command';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  PlusIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  ArrowLeftRightIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { getErrorMessage } from '@usertour/helpers';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { Delete2Icon, EditIcon } from '@usertour-packages/icons';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';

const PAGE_SIZE = 20;

interface AdminProjectItem {
  id: string;
  name: string;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
  licenseSource: string;
}

interface AdminUserOption {
  id: string;
  name: string | null;
  email: string | null;
  disabled?: boolean;
}

interface AdminProjectMemberItem {
  id: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  role: string;
  isOwner: boolean;
}

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

// ============================================================================
// Project Members Modal
// ============================================================================

const AddProjectMemberDialog = ({
  isOpen,
  onClose,
  onAdded,
  projectId,
  existingUserIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  projectId: string;
  existingUserIds: string[];
}) => {
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserDisplay, setSelectedUserDisplay] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const { data: usersData, loading: usersLoading } = useAdminUsersQuery(
    userSearchQuery.trim() || undefined,
    1,
    20,
  );
  const { invoke: addProjectMember, loading } = useAdminAddProjectMemberMutation();
  const { toast } = useToast();

  const availableUsers: AdminUserOption[] = (usersData?.items || []).filter(
    (user: AdminUserOption) => !user.disabled && !existingUserIds.includes(user.id),
  );
  const currentUser = availableUsers.find((user) => user.id === selectedUserId);
  const userButtonLabel =
    selectedUserDisplay ||
    (currentUser
      ? currentUser.name && currentUser.email
        ? `${currentUser.name} (${currentUser.email})`
        : currentUser.name || currentUser.email || currentUser.id
      : '');

  const resetState = () => {
    setUserPickerOpen(false);
    setUserSearchQuery('');
    setSelectedUserDisplay('');
    setSelectedUserId('');
    setSelectedRole('ADMIN');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast({ variant: 'destructive', title: 'Please select a user' });
      return;
    }
    try {
      await addProjectMember(projectId, selectedUserId, selectedRole);
      toast({ title: 'Member added successfully' });
      onAdded();
      handleClose();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-member-user">User</Label>
            <Popover
              open={userPickerOpen}
              onOpenChange={(open) => {
                setUserPickerOpen(open);
                if (!open) {
                  setUserSearchQuery('');
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  id="project-member-user"
                  variant="outline"
                  aria-expanded={userPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className={cn('truncate', !userButtonLabel && 'text-muted-foreground')}>
                    {userButtonLabel || 'Select a user'}
                  </span>
                  <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" withoutPortal>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onValueChange={setUserSearchQuery}
                  />
                  <CommandList>
                    {usersLoading ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : (
                      <>
                        {userSearchQuery.trim() ? (
                          <>
                            <CommandEmpty>No user found.</CommandEmpty>
                            <CommandGroup>
                              {availableUsers.map((user) => {
                                const label = user.name || user.email || user.id;
                                const description =
                                  user.name && user.email ? user.email : undefined;
                                const display =
                                  user.name && user.email
                                    ? `${user.name} (${user.email})`
                                    : user.name || user.email || user.id;

                                return (
                                  <CommandItem
                                    key={user.id}
                                    value={user.id}
                                    className="cursor-pointer"
                                    onSelect={() => {
                                      setSelectedUserId(user.id);
                                      setSelectedUserDisplay(display);
                                      setUserPickerOpen(false);
                                      setUserSearchQuery('');
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        selectedUserId === user.id ? 'opacity-100' : 'opacity-0',
                                      )}
                                    />
                                    <div className="flex min-w-0 flex-col">
                                      <span className="truncate">{label}</span>
                                      {description && (
                                        <span className="text-xs text-muted-foreground truncate">
                                          {description}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                            {availableUsers.length >= 20 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                                Showing top 20 results. Refine your search to narrow it down.
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                            Search users by name or email to add them to this project.
                          </div>
                        )}
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-member-role">Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="project-member-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MemberAction = ({
  member,
  projectId,
  onRefetch,
}: {
  member: AdminProjectMemberItem;
  projectId: string;
  onRefetch: () => void;
}) => {
  const { invoke: changeRole } = useAdminChangeProjectMemberRoleMutation();
  const { invoke: transferOwnership } = useAdminTransferProjectOwnershipMutation();
  const { invoke: removeMember } = useAdminRemoveProjectMemberMutation();
  const { toast } = useToast();

  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(member.role);

  const handleChangeRole = async () => {
    if (!member.userId) return;
    try {
      await changeRole(projectId, member.userId, selectedRole);
      toast({ title: 'Role changed successfully' });
      setChangeRoleOpen(false);
      onRefetch();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const handleTransfer = async () => {
    if (!member.userId) return;
    try {
      await transferOwnership(projectId, member.userId);
      toast({ title: 'Ownership transferred successfully' });
      setTransferOpen(false);
      onRefetch();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const handleRemove = async () => {
    if (!member.userId) return;
    try {
      await removeMember(projectId, member.userId);
      toast({ title: 'Member removed successfully' });
      setRemoveOpen(false);
      onRefetch();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={member.isOwner}
            onClick={() => {
              setSelectedRole(member.role);
              setChangeRoleOpen(true);
            }}
          >
            <EditIcon className="w-6" width={16} height={16} />
            Change role
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={member.isOwner}
            onClick={() => setTransferOpen(true)}
          >
            <ArrowLeftRightIcon className="w-6" height={16} width={16} />
            Transfer ownership to this user
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            disabled={member.isOwner}
            onClick={() => setRemoveOpen(true)}
          >
            <Delete2Icon className="w-6" width={16} height={16} />
            Remove member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Role Dialog */}
      <Dialog open={changeRoleOpen} onOpenChange={(op) => !op && setChangeRoleOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change team member role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole}>Change role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferOpen} onOpenChange={(op) => !op && setTransferOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer account ownership</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Only one user can be the owner of your Usertour account. Once you transfer ownership,
            you can&apos;t undo it. Confirm transferring account ownership to{' '}
            {member.name || member.email}?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleTransfer}>
              Transfer account ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeOpen} onOpenChange={(op) => !op && setRemoveOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Confirm removing member, {member.email}?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRemove}>Remove member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ProjectMembersModal = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}) => {
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const { data: members, loading, refetch } = useAdminProjectMembersQuery(projectId);
  const existingUserIds = (members || [])
    .map((member: AdminProjectMemberItem) => member.userId)
    .filter(Boolean) as string[];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{projectName} Members</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                  <PlusIcon className="w-4 h-4" />
                  Add Member
                </Button>
              </div>
              <div className="overflow-x-auto max-h-96">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead className="w-28">Role</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members?.map((member: AdminProjectMemberItem) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              email={member.email || ''}
                              name={member.name || undefined}
                            />
                            <span className="truncate max-w-48">{member.name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="truncate hidden sm:table-cell">
                          {member.email || '-'}
                        </TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>
                          <MemberAction member={member} projectId={projectId} onRefetch={refetch} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!members || members.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No members.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AddProjectMemberDialog
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        onAdded={refetch}
        projectId={projectId}
        existingUserIds={existingUserIds}
      />
    </>
  );
};

// ============================================================================
// Project List Action
// ============================================================================

const ProjectListAction = ({
  project,
}: {
  project: AdminProjectItem;
}) => {
  const navigate = useNavigate();
  const [membersOpen, setMembersOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => navigate(`/project/${project.id}/settings/general`)}
          >
            <ExternalLinkIcon className="w-4 h-4 mr-2" />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setMembersOpen(true)}>
            View Members
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProjectMembersModal
        isOpen={membersOpen}
        onClose={() => setMembersOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />
    </>
  );
};

// ============================================================================
// Create Project Dialog
// ============================================================================

const CreateProjectDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [selectedOwnerDisplay, setSelectedOwnerDisplay] = useState('');
  const { data: usersData, loading: usersLoading } = useAdminUsersQuery(
    ownerSearchQuery.trim() || undefined,
    1,
    20,
  );
  const { invoke: createProject, loading } = useAdminCreateProjectMutation();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');

  const users: AdminUserOption[] = usersData?.items || [];
  const currentOwner = users.find((user) => user.id === ownerUserId);
  const ownerButtonLabel =
    selectedOwnerDisplay ||
    (currentOwner
      ? currentOwner.name && currentOwner.email
        ? `${currentOwner.name} (${currentOwner.email})`
        : currentOwner.name || currentOwner.email || currentOwner.id
      : '');

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      toast({ variant: 'destructive', title: 'Please enter a project name' });
      return;
    }
    if (!ownerUserId) {
      toast({ variant: 'destructive', title: 'Please select an owner' });
      return;
    }
    try {
      await createProject(projectName.trim(), ownerUserId);
      toast({ title: 'Project created successfully' });
      setProjectName('');
      setOwnerUserId('');
      setSelectedOwnerDisplay('');
      setOwnerSearchQuery('');
      setOwnerPickerOpen(false);
      onClose();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
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
            <Popover
              open={ownerPickerOpen}
              onOpenChange={(open) => {
                setOwnerPickerOpen(open);
                if (!open) {
                  setOwnerSearchQuery('');
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  id="owner"
                  variant="outline"
                  aria-expanded={ownerPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className={cn('truncate', !ownerButtonLabel && 'text-muted-foreground')}>
                    {ownerButtonLabel || 'Select an owner'}
                  </span>
                  <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" withoutPortal>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search by name or email..."
                    value={ownerSearchQuery}
                    onValueChange={setOwnerSearchQuery}
                  />
                  <CommandList>
                    {usersLoading ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : (
                      <>
                        {ownerSearchQuery.trim() ? (
                          <>
                            <CommandEmpty>No user found.</CommandEmpty>
                            <CommandGroup>
                              {users.map((user) => {
                                const label = user.name || user.email || user.id;
                                const description =
                                  user.name && user.email ? user.email : undefined;
                                const display =
                                  user.name && user.email
                                    ? `${user.name} (${user.email})`
                                    : user.name || user.email || user.id;

                                return (
                                  <CommandItem
                                    key={user.id}
                                    value={user.id}
                                    className="cursor-pointer"
                                    onSelect={() => {
                                      setOwnerUserId(user.id);
                                      setSelectedOwnerDisplay(display);
                                      setOwnerPickerOpen(false);
                                      setOwnerSearchQuery('');
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        ownerUserId === user.id ? 'opacity-100' : 'opacity-0',
                                      )}
                                    />
                                    <div className="flex min-w-0 flex-col">
                                      <span className="truncate">{label}</span>
                                      {description && (
                                        <span className="text-xs text-muted-foreground truncate">
                                          {description}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                            {users.length >= 20 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                                Showing top 20 results. Refine your search to narrow it down.
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                            Search users by name or email to select an owner.
                          </div>
                        )}
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// Main Projects Page
// ============================================================================

export const AdminProjectsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data, loading, refetch } = useAdminProjectsQuery(
    searchQuery || undefined,
    currentPage,
    PAGE_SIZE,
  );

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const items: AdminProjectItem[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <SettingsContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Projects</h3>
            <p className="text-sm text-muted-foreground">
              View and manage all projects in this self-hosted instance, including owners and
              members.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <Button onClick={() => setIsCreateDialogOpen(true)} className="flex-none">
              <PlusIcon className="w-4 h-4" />
              Create Project
            </Button>
            <div className="relative w-full md:w-[240px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Find a project"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
        <Separator />

        {loading ? (
          <ListSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <Table className="table-fixed min-w-2xl">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="w-32 hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-24 text-center">Members</TableHead>
                  <TableHead className="w-28 text-center">License</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((project: AdminProjectItem) => (
                  <TableRow key={project.id}>
                    <TableCell className="truncate">{project.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar
                          email={project.ownerEmail || ''}
                          name={project.ownerName || undefined}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{project.ownerName || '-'}</span>
                          {project.ownerEmail && (
                            <span className="text-xs text-muted-foreground truncate">
                              {project.ownerEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {format(new Date(project.createdAt), 'PP')}
                    </TableCell>
                    <TableCell className="text-center">{project.memberCount}</TableCell>
                    <TableCell className="text-center">
                      <LicenseSourceBadge source={project.licenseSource} />
                    </TableCell>
                    <TableCell>
                      <ProjectListAction project={project} />
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No projects found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-muted-foreground">
              {total} project{total !== 1 ? 's' : ''} total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SettingsContent>

      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          refetch();
        }}
      />
    </>
  );
};

AdminProjectsPage.displayName = 'AdminProjectsPage';
