'use client';

import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { EnvironmentCreateForm } from '@/pages/settings/environments/components/environment-create-form';
import { Environment } from '@/types/project';
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import { Avatar, AvatarFallback, AvatarImage } from '@usertour-ui/avatar';
import { Button } from '@usertour-ui/button';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@usertour-ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-ui/popover';
import { cn } from '@usertour-ui/ui-utils';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const AdminEnvSwitcher = () => {
  const [open, setOpen] = React.useState(false);
  const [showNewEnvDialog, setShowNewEnvDialog] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setEnvironment, environment, isViewOnly } = useAppContext();

  const { environmentList, refetch } = useEnvironmentListContext();

  const handleItemClick = React.useCallback(
    (env: Environment) => {
      if (env.id) {
        if (environment?.id) {
          const currentPath = location.pathname;
          const newPath = currentPath.replace(environment.id, env.id);
          navigate(newPath);
        }
        setEnvironment(env);
      }
      setOpen(false);
    },
    [environment, location.pathname, navigate],
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
                      <AvatarImage
                        src="https://avatar.vercel.sh/acme-inc.png"
                        alt={env.name}
                        className="grayscale"
                      />
                      <AvatarFallback>SC</AvatarFallback>
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
