import { useAppContext } from '@/contexts/app-context';
import { getGravatarUrl } from '@/utils/avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@usertour-ui/avatar';
import { Badge } from '@usertour-ui/badge';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { useActiveUserProjectMutation } from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import isHotkey from 'is-hotkey';
import { usePostHog } from 'posthog-js/react';
import { useNavigate } from 'react-router-dom';
import { useEvent } from 'react-use';

export const AdminUserNav = () => {
  const { userInfo: user, handleLogout } = useAppContext();
  const { project, projects } = useAppContext();
  const posthog = usePostHog();
  const { invoke } = useActiveUserProjectMutation();
  const { toast } = useToast();

  const navigate = useNavigate();

  const logoutHandler = async () => {
    await handleLogout();
    posthog?.capture('clicked_log_in');
    return navigate('/auth/signin');
  };

  const hotkeys = {
    'mod+u': `/project/${project?.id}/settings/account`,
    'mod+m': `/project/${project?.id}/settings/themes`,
    'mod+e': `/project/${project?.id}/settings/events`,
    'shift+mod+k': '/auth/signin',
  };
  const handleKeyEvent = (event: any) => {
    for (const key in hotkeys) {
      const path = hotkeys[key as keyof typeof hotkeys];
      if (isHotkey(key, event)) {
        if (path === '/auth/signin') {
          logoutHandler();
        } else {
          navigate(path);
        }
      }
    }
  };
  useEvent('keydown', handleKeyEvent, window, { capture: true });

  const avatarUrl = user?.email ? getGravatarUrl(user?.email) : '';

  const handleActiveProject = async (projectId: string | undefined) => {
    if (user?.id && projectId) {
      try {
        await invoke(user?.id, projectId);
        // Refresh the current page after successfully switching project
        window.location.reload();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Switch project failed',
        });
        console.error(error);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex p-0 text-sm rounded-full shadow-none dark:bg-transparent ring-transparent hover:bg-transparent focus:ring-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={user?.name ?? ''} />
            <AvatarFallback className="bg-white">T</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount side="right">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate(`/project/${project?.id}/settings/account`)}>
            Account
            <DropdownMenuShortcut>⌘U</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/project/${project?.id}/settings/themes`)}>
            Themes
            <DropdownMenuShortcut>⌘M</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/project/${project?.id}/settings/events`)}>
            Events
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate(`/project/${project?.id}/settings/environments`)}
          >
            Environments
          </DropdownMenuItem>
          {/* <DropdownMenuSeparator />
          <DropdownMenuLabel className="font-normal">My Organizations</DropdownMenuLabel> */}
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>My Organizations</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-56">
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => handleActiveProject(p.id)}
                  >
                    {p.name} {p.actived && <Badge variant={'success'}>Current</Badge>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logoutHandler}>
          Log out
          <DropdownMenuShortcut>⇧⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

AdminUserNav.displayName = 'AdminUserNav';
