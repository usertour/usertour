import {
  useAdminUsersQuery,
  useUpdateUserSystemAdminMutation,
  useUpdateUserDisabledMutation,
  useAdminCreateUserMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { SettingsContent } from '@/pages/settings/components/content';
import { Separator } from '@usertour-packages/separator';
import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Badge } from '@usertour-packages/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@usertour-packages/command';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import { CheckIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  PlusIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  XIcon,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { getErrorMessage } from '@usertour/helpers';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { cn } from '@usertour-packages/tailwind';

const PAGE_SIZE = 20;

const UserFilterButton = ({
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
      <PopoverContent align="start" className="w-[220px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
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
                    Clear filter
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

interface AdminUserItem {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  isSystemAdmin: boolean;
  disabled: boolean;
  projectCount: number;
}

const UserListAction = ({
  user,
  onRefetch,
}: {
  user: AdminUserItem;
  onRefetch: () => void;
}) => {
  const { invoke: updateSystemAdmin } = useUpdateUserSystemAdminMutation();
  const { invoke: updateDisabled } = useUpdateUserDisabledMutation();
  const { toast } = useToast();

  const handleToggleAdmin = async () => {
    try {
      await updateSystemAdmin(user.id, !user.isSystemAdmin);
      toast({
        title: user.isSystemAdmin ? 'System admin removed' : 'System admin granted',
      });
      onRefetch();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const handleToggleDisabled = async () => {
    try {
      await updateDisabled(user.id, !user.disabled);
      toast({
        title: user.disabled ? 'User enabled' : 'User disabled',
      });
      onRefetch();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <DotsHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem className="cursor-pointer" onClick={handleToggleAdmin}>
          {user.isSystemAdmin ? 'Remove System Admin' : 'Make System Admin'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={
            user.disabled
              ? 'cursor-pointer'
              : 'text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer'
          }
          onClick={handleToggleDisabled}
        >
          {user.disabled ? 'Enable User' : 'Disable User'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AddUserDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { invoke: createUser, loading } = useAdminCreateUserMutation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Please enter a name' });
      return;
    }
    if (!email.trim()) {
      toast({ variant: 'destructive', title: 'Please enter an email' });
      return;
    }
    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Password must be at least 8 characters',
      });
      return;
    }
    try {
      await createUser(name.trim(), email.trim().toLowerCase(), password);
      toast({ title: 'User created successfully' });
      setName('');
      setEmail('');
      setPassword('');
      onClose();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">Password</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Add User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const AdminUsersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const { data, loading, refetch } = useAdminUsersQuery(
    searchQuery || undefined,
    currentPage,
    PAGE_SIZE,
    statusFilter,
    roleFilter,
  );

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleRoleFilterChange = useCallback((value: string) => {
    setRoleFilter(value);
    setCurrentPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setRoleFilter('all');
    setCurrentPage(1);
  }, []);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  const items: AdminUserItem[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = !!searchQuery || statusFilter !== 'all' || roleFilter !== 'all';

  return (
    <>
      <SettingsContent>
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold tracking-tight">Users</h3>
          <p className="text-sm text-muted-foreground">
            View and manage all users in this self-hosted instance, including system admin access.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-[240px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Find a user"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-8 pl-9 md:w-[240px]"
              />
            </div>
            <UserFilterButton
              label="Status"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Disabled', value: 'disabled' },
              ]}
            />
            <UserFilterButton
              label="Role"
              value={roleFilter}
              onChange={handleRoleFilterChange}
              options={[
                { label: 'All', value: 'all' },
                { label: 'System Admin', value: 'systemAdmin' },
                { label: 'Non-admin', value: 'nonAdmin' },
              ]}
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2 lg:px-3"
              >
                Reset
                <XIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-8 flex-none">
            <PlusIcon className="w-4 h-4" />
            Add User
          </Button>
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
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="w-32 hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-24 text-center">Projects</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((user: AdminUserItem) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar email={user.email || ''} name={user.name || undefined} />
                        <span className="truncate max-w-64">{user.name || '-'}</span>
                        {user.isSystemAdmin && (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-xs">Admin</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="truncate hidden sm:table-cell">
                      {user.email || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {format(new Date(user.createdAt), 'PP')}
                    </TableCell>
                    <TableCell className="text-center">{user.projectCount}</TableCell>
                    <TableCell className="text-center">
                      {user.disabled ? (
                        <Badge variant="destructive">Disabled</Badge>
                      ) : (
                        <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserListAction user={user} onRefetch={handleRefetch} />
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No users found.
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
              {total} user{total !== 1 ? 's' : ''} total
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

      <AddUserDialog
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          refetch();
        }}
      />
    </>
  );
};

AdminUsersPage.displayName = 'AdminUsersPage';
