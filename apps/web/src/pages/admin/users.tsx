import {
  useAdminUsersQuery,
  useUpdateUserSystemAdminMutation,
  useUpdateUserDisabledMutation,
  useAdminCreateUserMutation,
} from '@usertour/hooks';
import {
  useToast,
  Separator,
  Button,
  Input,
  Label,
  Badge,
  Command,
  CommandEmpty,
  CommandGroup,
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ListSkeleton,
  UserAvatar,
} from '@usertour/ui';
import { SettingsContent } from '@/pages/settings/components/content';
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
import { cn } from '@usertour/tailwind';
import { useTranslation } from 'react-i18next';

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
      <PopoverContent align="start" className="w-[220px] p-0">
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
                    {t('admin.users.clearFilter')}
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
  const { t } = useTranslation();
  const { invoke: updateSystemAdmin } = useUpdateUserSystemAdminMutation();
  const { invoke: updateDisabled } = useUpdateUserDisabledMutation();
  const { toast } = useToast();

  const handleToggleAdmin = async () => {
    try {
      await updateSystemAdmin(user.id, !user.isSystemAdmin);
      toast({
        title: user.isSystemAdmin
          ? t('admin.users.systemAdminRemoved')
          : t('admin.users.systemAdminGranted'),
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
        title: user.disabled ? t('admin.users.userEnabled') : t('admin.users.userDisabled'),
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
          {user.isSystemAdmin
            ? t('admin.users.removeSystemAdmin')
            : t('admin.users.makeSystemAdmin')}
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
          {user.disabled ? t('admin.users.enableUser') : t('admin.users.disableUser')}
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
  const { t } = useTranslation();
  const { invoke: createUser, loading } = useAdminCreateUserMutation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: t('admin.users.validationNameRequired') });
      return;
    }
    if (!email.trim()) {
      toast({ variant: 'destructive', title: t('admin.users.validationEmailRequired') });
      return;
    }
    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: t('admin.users.validationPasswordMinLength'),
      });
      return;
    }
    try {
      await createUser(name.trim(), email.trim().toLowerCase(), password);
      toast({ title: t('admin.users.userCreatedSuccess') });
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
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('admin.users.addUserTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">{t('admin.common.name')}</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.users.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">{t('admin.common.email')}</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('admin.users.emailPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">{t('admin.users.passwordLabel')}</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('admin.users.passwordPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('admin.common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('admin.users.creating') : t('admin.users.addUserTitle')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const AdminUsersPage = () => {
  const { t } = useTranslation();
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
          <h3 className="text-xl font-semibold tracking-tight">{t('admin.users.pageTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('admin.users.pageDescription')}</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-[240px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.users.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-8 pl-9 md:w-[240px]"
              />
            </div>
            <UserFilterButton
              label={t('admin.common.status')}
              value={statusFilter}
              onChange={handleStatusFilterChange}
              options={[
                { label: t('admin.common.all'), value: 'all' },
                { label: t('admin.users.statusActive'), value: 'active' },
                { label: t('admin.users.statusDisabled'), value: 'disabled' },
              ]}
            />
            <UserFilterButton
              label={t('admin.users.filterRole')}
              value={roleFilter}
              onChange={handleRoleFilterChange}
              options={[
                { label: t('admin.common.all'), value: 'all' },
                { label: t('admin.users.roleSystemAdmin'), value: 'systemAdmin' },
                { label: t('admin.users.roleNonAdmin'), value: 'nonAdmin' },
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
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-8 flex-none">
            <PlusIcon className="w-4 h-4" />
            {t('admin.users.addUserTitle')}
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
                  <TableHead>{t('admin.common.name')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('admin.common.email')}</TableHead>
                  <TableHead className="w-32 hidden lg:table-cell">
                    {t('admin.common.created')}
                  </TableHead>
                  <TableHead className="w-24 text-center">{t('admin.common.projects')}</TableHead>
                  <TableHead className="w-28 text-center">{t('admin.common.status')}</TableHead>
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
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-xs">
                            {t('admin.common.roleAdmin')}
                          </Badge>
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
                        <Badge variant="destructive">{t('admin.users.statusDisabled')}</Badge>
                      ) : (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          {t('admin.users.statusActive')}
                        </Badge>
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
                      {t('admin.users.noUsersFound')}
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
              {t('admin.users.totalUsers', { count: total })}
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
