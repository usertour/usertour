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

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>;

interface EnvSwitcherProps extends PopoverTriggerProps {}

export const AdminEnvSwitcher = ({ className }: EnvSwitcherProps) => {
  const [open, setOpen] = React.useState(false);
  const [showNewEnvDialog, setShowNewEnvDialog] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setEnvironment, environment } = useAppContext();

  const { environmentList, refetch } = useEnvironmentListContext();

  const handleItemClick = React.useCallback(
    (env: Environment) => {
      if (env.id) {
        if (environment?.id) {
          const newPath = location.pathname.replace(environment?.id, env.id);
          navigate(newPath);
        }
        setEnvironment(env);
      }
      setOpen(false);
    },
    [environment],
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
            variant="outline"
            aria-expanded={open}
            aria-label="Select a team"
            className={cn(className)}
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src="https://avatar.vercel.sh/monsters.png" alt={environment?.name} />
              <AvatarFallback>SC</AvatarFallback>
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
                <CommandItem onSelect={handleCreate}>
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
