'use client';

import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { useMemberEnvScope } from '@/hooks/use-member-env-scope';
import { useEnvironmentSelection } from '@/hooks/use-environment-selection';
import { EnvironmentCreateDialog } from '@/pages/settings/environments/components/environment-create-dialog';
import { Environment } from '@usertour/types';
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const AdminEnvSwitcher = () => {
  const [open, setOpen] = React.useState(false);
  const [showNewEnvDialog, setShowNewEnvDialog] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { environment, isViewOnly } = useAppContext();
  const { selectEnvironment } = useEnvironmentSelection();
  const { t } = useTranslation();

  const { environmentList: allEnvironments } = useEnvironmentList();
  // Members restricted to a subset of environments only see those here —
  // switching into an out-of-scope environment would just be a wall of E0055s.
  const { canActOn } = useMemberEnvScope();
  const environmentList = React.useMemo(
    () => allEnvironments?.filter((env) => canActOn(env.id)),
    [allEnvironments, canActOn],
  );

  const handleItemClick = React.useCallback(
    (env: Environment) => {
      if (env.id) {
        // If path starts with /env/, extract and replace envId
        if (location.pathname.startsWith('/env/')) {
          const match = location.pathname.match(/^\/env\/([^/]+)/);
          if (match) {
            const [, currentEnvId] = match;
            // Replace envId in path, handle both /env/:id and /env/:id/... cases
            const newPathname = location.pathname.replace(`/env/${currentEnvId}`, `/env/${env.id}`);
            // Navigate with both new pathname and preserved search params
            navigate(`${newPathname}${location.search}`, { replace: false });
          }
        }
        // Always update environment context
        selectEnvironment(env);
      }
      setOpen(false);
    },
    [location.pathname, location.search, navigate, selectEnvironment],
  );
  const handleCreate = () => {
    setShowNewEnvDialog(true);
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex p-0 text-sm rounded-full shadow-none dark:bg-transparent ring-transparent hover:bg-transparent focus:ring-0"
          >
            <Avatar className="h-8 w-8">
              {/* <AvatarImage src="https://avatar.vercel.sh/monsters.png" alt={environment?.name} /> */}
              <AvatarFallback className="bg-blue-800 text-background">
                {/* Get first two characters of environment name if available */}

                {environment?.name?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {/* {environment?.name} */}
            {/* <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" /> */}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]" align="end" forceMount side="right">
          <DropdownMenuLabel className="font-normal">
            {t('settings.nav.sections.environments')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {environmentList?.map((env) => (
              <DropdownMenuItem
                key={env.id}
                onClick={() => {
                  handleItemClick(env);
                }}
                className="text-sm"
              >
                <Avatar className="mr-2 h-5 w-5">
                  <AvatarFallback className="bg-blue-800 text-white text-xs">
                    {env?.name?.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{env.name}</span>
                <CheckIcon
                  className={cn(
                    'ml-auto h-4 w-4',
                    env.id === environment?.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handleCreate} disabled={isViewOnly}>
              <PlusCircledIcon className="mr-2 h-5 w-5" />
              {t('settings.environments.createButton')}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* createEnvironment carries refetchQueries: ['userEnvironments'], the
          query backing this switcher list, so no onSubmit refetch is needed. */}
      <EnvironmentCreateDialog open={showNewEnvDialog} onOpenChange={setShowNewEnvDialog} />
    </>
  );
};

AdminEnvSwitcher.displayName = 'AdminEnvSwitcher';
