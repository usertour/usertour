import {
  useAdminProjectsQuery,
  useAdminSettingsQuery,
  useAdminUsersQuery,
  useAdminCreateProjectMutation,
  useUpdateProjectUsesInstanceLicenseMutation,
  useAdminProjectMembersQuery,
  useAdminAddProjectMemberMutation,
  useAdminChangeProjectMemberRoleMutation,
  useAdminTransferProjectOwnershipMutation,
  useAdminRemoveProjectMemberMutation,
} from '@usertour/hooks';
import {
  useToast,
  Separator,
  Button,
  Badge,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ListSkeleton,
  UserAvatar,
} from '@usertour/ui';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsContent } from '@/pages/settings/components/content';
import { cn } from '@usertour/tailwind';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  PlusIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  ArrowLeftRightIcon,
  PlusCircleIcon,
  XIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { getErrorMessage } from '@usertour/helpers';
import { useNavigate } from 'react-router-dom';
import { Delete2Icon, EditIcon } from '@usertour/icons';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';

const PAGE_SIZE = 20;

const ProjectFilterButton = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) => {
  const { t } = useTranslation();
  const activeOption = options.find((option) => option.value === value);
  const hasSelection = value !== 'all';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed font-normal">
          <PlusCircleIcon className="h-4 w-4" />
          {label}
          {hasSelection && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {activeOption?.label}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>{t('admin.common.noResults')}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => onChange(option.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-[4px] border',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input [&_svg]:invisible',
                      )}
                    >
                      <CheckIcon className="size-3.5 text-primary-foreground" />
                    </div>
                    <span className="whitespace-nowrap">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {hasSelection && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange('all')}
                    className="justify-center text-center cursor-pointer"
                  >
                    {t('admin.projects.clearFilter')}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface AdminProjectItem {
  id: string;
  name: string;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
  usesInstanceLicense: boolean;
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
  const { t } = useTranslation();
  switch (source) {
    case 'project':
      return <Badge variant="outline">{t('admin.projects.licenseSourceProject')}</Badge>;
    case 'instance':
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700">
          {t('admin.projects.licenseSourceInstance')}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{t('admin.projects.licenseSourceNone')}</Badge>;
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
  const { t } = useTranslation();
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
      toast({ variant: 'destructive', title: t('admin.projects.pleaseSelectUser') });
      return;
    }
    try {
      await addProjectMember(projectId, selectedUserId, selectedRole);
      toast({ title: t('admin.projects.memberAddedSuccess') });
      onAdded();
      handleClose();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && handleClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('admin.projects.addMemberTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-member-user">{t('admin.projects.userLabel')}</Label>
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
                    {userButtonLabel || t('admin.common.selectUser')}
                  </span>
                  <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" withoutPortal>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('admin.common.searchByNameOrEmail')}
                    value={userSearchQuery}
                    onValueChange={setUserSearchQuery}
                  />
                  <CommandList>
                    {usersLoading ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        {t('common.loading')}
                      </div>
                    ) : (
                      <>
                        {userSearchQuery.trim() ? (
                          <>
                            <CommandEmpty>{t('admin.common.noUserFound')}</CommandEmpty>
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
                                {t('admin.projects.showingTop20')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                            {t('admin.projects.searchUsersHintMember')}
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
            <Label htmlFor="project-member-role">{t('admin.common.role')}</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="project-member-role">
                <SelectValue placeholder={t('admin.common.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{t('admin.common.roleAdmin')}</SelectItem>
                <SelectItem value="VIEWER">{t('admin.common.roleViewer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('admin.common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('admin.projects.addingMember') : t('admin.projects.addMemberButton')}
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
  const { t } = useTranslation();
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
      toast({ title: t('admin.projects.roleChangedSuccess') });
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
      toast({ title: t('admin.projects.ownershipTransferredSuccess') });
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
      toast({ title: t('admin.projects.memberRemovedSuccess') });
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
            disabled={member.isOwner}
            onClick={() => {
              setSelectedRole(member.role);
              setChangeRoleOpen(true);
            }}
          >
            <EditIcon className="w-6" width={16} height={16} />
            {t('admin.projects.changeRole')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={member.isOwner} onClick={() => setTransferOpen(true)}>
            <ArrowLeftRightIcon className="w-6" height={16} width={16} />
            {t('admin.projects.transferOwnershipAction')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={member.isOwner}
            onClick={() => setRemoveOpen(true)}
          >
            <Delete2Icon className="w-6" width={16} height={16} />
            {t('admin.projects.removeMember')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Role Dialog */}
      <Dialog open={changeRoleOpen} onOpenChange={(op) => !op && setChangeRoleOpen(false)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('admin.projects.changeRoleTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.common.role')}</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.common.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t('admin.common.roleAdmin')}</SelectItem>
                  <SelectItem value="VIEWER">{t('admin.common.roleViewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleOpen(false)}>
              {t('admin.common.cancel')}
            </Button>
            <Button onClick={handleChangeRole}>{t('admin.projects.changeRole')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferOpen} onOpenChange={(op) => !op && setTransferOpen(false)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('admin.projects.transferOwnershipTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('admin.projects.transferOwnershipConfirm', {
              memberName: member.name || member.email,
            })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              {t('admin.common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleTransfer}>
              {t('admin.projects.transferOwnershipButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeOpen} onOpenChange={(op) => !op && setRemoveOpen(false)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('admin.projects.confirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('admin.projects.removeMemberConfirm', { email: member.email })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              {t('admin.common.cancel')}
            </Button>
            <Button onClick={handleRemove}>{t('admin.projects.removeMemberButton')}</Button>
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
  const { t } = useTranslation();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const { data: members, loading, refetch } = useAdminProjectMembersQuery(projectId);
  const existingUserIds = (members || [])
    .map((member: AdminProjectMemberItem) => member.userId)
    .filter(Boolean) as string[];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('admin.projects.membersDialogTitle', { projectName })}</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('admin.projects.memberCount', { count: members?.length || 0 })}
                </span>
                <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                  <PlusIcon className="w-4 h-4" />
                  {t('admin.projects.addMemberButton')}
                </Button>
              </div>
              <div className="overflow-x-auto max-h-96">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.common.name')}</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        {t('admin.common.email')}
                      </TableHead>
                      <TableHead className="w-28">{t('admin.common.role')}</TableHead>
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
                          {t('admin.projects.noMembers')}
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
  isUnlimitedInstanceLicense,
  onRefetch,
}: {
  project: AdminProjectItem;
  isUnlimitedInstanceLicense: boolean;
  onRefetch: () => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [membersOpen, setMembersOpen] = useState(false);
  const { invoke: updateProjectUsesInstanceLicense, loading } =
    useUpdateProjectUsesInstanceLicenseMutation();
  const { toast } = useToast();

  const handleToggleInstanceLicense = async () => {
    try {
      await updateProjectUsesInstanceLicense(project.id, !project.usesInstanceLicense);
      toast({
        title: project.usesInstanceLicense
          ? t('admin.projects.instanceLicenseDisabled')
          : t('admin.projects.instanceLicenseEnabled'),
      });
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
          <DropdownMenuItem onClick={() => navigate(`/project/${project.id}/settings/general`)}>
            <ExternalLinkIcon className="w-4 h-4 mr-2" />
            {t('admin.projects.openProject')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMembersOpen(true)}>
            {t('admin.projects.viewMembers')}
          </DropdownMenuItem>
          {!isUnlimitedInstanceLicense && (
            <DropdownMenuItem disabled={loading} onClick={handleToggleInstanceLicense}>
              {project.usesInstanceLicense
                ? t('admin.projects.stopUsingInstanceLicense')
                : t('admin.projects.useInstanceLicense')}
            </DropdownMenuItem>
          )}
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
  const { t } = useTranslation();
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
      toast({ variant: 'destructive', title: t('admin.projects.pleaseEnterProjectName') });
      return;
    }
    if (!ownerUserId) {
      toast({ variant: 'destructive', title: t('admin.projects.pleaseSelectOwner') });
      return;
    }
    try {
      await createProject(projectName.trim(), ownerUserId);
      toast({ title: t('admin.projects.projectCreatedSuccess') });
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
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('admin.projects.createProjectTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">{t('admin.projects.projectNameLabel')}</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t('admin.projects.projectNamePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner">{t('admin.projects.ownerLabel')}</Label>
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
                    {ownerButtonLabel || t('admin.projects.selectOwner')}
                  </span>
                  <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" withoutPortal>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('admin.common.searchByNameOrEmail')}
                    value={ownerSearchQuery}
                    onValueChange={setOwnerSearchQuery}
                  />
                  <CommandList>
                    {usersLoading ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        {t('common.loading')}
                      </div>
                    ) : (
                      <>
                        {ownerSearchQuery.trim() ? (
                          <>
                            <CommandEmpty>{t('admin.common.noUserFound')}</CommandEmpty>
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
                                {t('admin.projects.showingTop20')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                            {t('admin.projects.searchUsersHintOwner')}
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
            {t('admin.common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('admin.projects.creatingProject') : t('admin.projects.createButton')}
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
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const { data: settingsData, refetch: refetchSettings } = useAdminSettingsQuery();
  const { data, loading, refetch } = useAdminProjectsQuery(
    searchQuery || undefined,
    currentPage,
    PAGE_SIZE,
    assignmentFilter,
  );

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleAssignmentFilterChange = useCallback((value: string) => {
    setAssignmentFilter(value);
    setCurrentPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setAssignmentFilter('all');
    setCurrentPage(1);
  }, []);

  const items: AdminProjectItem[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const projectLimit = settingsData?.licenseInfo?.payload?.projectLimit;
  const hasValidInstanceLicense = settingsData?.licenseInfo?.isValid ?? false;
  const isUnlimitedInstanceLicense =
    hasValidInstanceLicense && (projectLimit === null || projectLimit === undefined);
  const isOverProjectLimit = settingsData?.isOverProjectLimit || false;
  const handleRefetchAll = useCallback(() => {
    refetch();
    refetchSettings();
  }, [refetch, refetchSettings]);
  const hasActiveFilters = !!searchQuery || assignmentFilter !== 'all';

  return (
    <>
      <SettingsContent>
        <div className="space-y-2">
          <h3 className="text-xl font-medium tracking-tight">{t('admin.projects.pageTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('admin.projects.pageDescription')}</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-[240px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.projects.findProject')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-8 pl-9 md:w-[240px]"
              />
            </div>
            <ProjectFilterButton
              label={t('admin.projects.assignmentFilter')}
              value={assignmentFilter}
              onChange={handleAssignmentFilterChange}
              options={[
                { label: t('admin.common.all'), value: 'all' },
                { label: t('admin.projects.usingInstanceLicense'), value: 'using' },
                { label: t('admin.projects.notUsingInstanceLicense'), value: 'notUsing' },
              ]}
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2 lg:px-3"
              >
                {t('common.reset')}
                <XIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="h-8 flex-none">
            <PlusIcon className="w-4 h-4" />
            {t('admin.projects.createProject')}
          </Button>
        </div>
        <Separator />

        {isOverProjectLimit && (
          <div className="py-4">
            <div className="text-sm text-destructive">
              {t('admin.projects.overProjectLimitWarning')}
            </div>
          </div>
        )}

        {loading ? (
          <ListSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <Table className="table-fixed min-w-2xl">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.common.name')}</TableHead>
                  <TableHead>{t('admin.projects.ownerColumn')}</TableHead>
                  <TableHead className="w-32 hidden lg:table-cell">
                    {t('admin.common.created')}
                  </TableHead>
                  <TableHead className="w-24 text-center">{t('admin.common.members')}</TableHead>
                  <TableHead className="w-28 text-center">
                    {t('admin.projects.licenseColumn')}
                  </TableHead>
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
                      <ProjectListAction
                        project={project}
                        isUnlimitedInstanceLicense={isUnlimitedInstanceLicense}
                        onRefetch={handleRefetchAll}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t('admin.projects.noProjectsFound')}
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
              {t('admin.projects.totalProjects', { count: total })}
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
                {t('admin.common.pageOf', { current: currentPage, total: totalPages })}
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
          handleRefetchAll();
        }}
      />
    </>
  );
};

AdminProjectsPage.displayName = 'AdminProjectsPage';
