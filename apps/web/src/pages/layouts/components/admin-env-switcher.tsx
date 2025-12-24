'use client';

import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { useEnvironmentSelection } from '@/hooks/use-environment-selection';
import { EnvironmentCreateForm } from '@/pages/settings/environments/components/environment-create-form';
import { Environment } from '@usertour/types';
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import { Avatar, AvatarFallback } from '@usertour-packages/avatar';
import { Button } from '@usertour-packages/button';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@usertour-packages/command';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour/helpers';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const AdminEnvSwitcher = () => {
  const [open, setOpen] = React.useState(false);
  const [showNewEnvDialog, setShowNewEnvDialog] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { environment, isViewOnly } = useAppContext();
  const { selectEnvironment } = useEnvironmentSelection();

  const { environmentList, refetch } = useEnvironmentListContext();

  const handleItemClick = React.useCallback(
    (env: Environment) => {
      if (env.id) {
        const currentPath = location.pathname;
        // If path starts with /env/, extract and replace envId
        if (currentPath.startsWith('/env/')) {
          const match = currentPath.match(/^\/env\/([^/]+)/);
          if (match) {
            const [, currentEnvId] = match;
            // Replace envId in path, handle both /env/:id and /env/:id/... cases
            const newPath = currentPath.replace(`/env/${currentEnvId}`, `/env/${env.id}`);
            navigate(newPath);
          }
        }
        // Always update environment context
        selectEnvironment(env);
      }
      setOpen(false);
    },
    [location.pathname, navigate, selectEnvironment],
  );
  const handleCreate = () => {
    setShowNewEnvDialog(true);
  };
  const handleOnClose = () => {
    setShowNewEnvDialog(false);
    refetch();
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
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
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" side="right">
          <Command>
            <CommandList>
              <CommandGroup key={'aaaa'} heading="Environments">
                {environmentList?.map((env) => (
                  <CommandItem
                    key={env.id}
                    value={env.id}
                    onSelect={() => {
                      handleItemClick(env);
                    }}
                    className="text-sm"
                  >
                    <Avatar className="mr-2 h-5 w-5">
                      <AvatarFallback className="bg-blue-800 text-white text-xs">
                        {env?.name?.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {env.name}
                    <CheckIcon
                      className={cn(
                        'ml-auto h-4 w-4',
                        env.id === environment?.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <CommandItem onSelect={handleCreate} disabled={isViewOnly}>
                  <PlusCircledIcon className="mr-2 h-5 w-5" />
                  Create Environment
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <EnvironmentCreateForm isOpen={showNewEnvDialog} onClose={handleOnClose} />
    </>
  );
};

AdminEnvSwitcher.displayName = 'AdminEnvSwitcher';
