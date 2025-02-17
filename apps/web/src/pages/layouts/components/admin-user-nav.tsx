import { useAppContext } from '@/contexts/app-context';
import { getGravatarUrl } from '@/utils/avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@usertour-ui/avatar';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import isHotkey from 'is-hotkey';
import { usePostHog } from 'posthog-js/react';
import { useNavigate } from 'react-router-dom';
import { useEvent } from 'react-use';

export const AdminUserNav = () => {
  const { userInfo: user, handleLogout } = useAppContext();
  const { project } = useAppContext();
  const posthog = usePostHog();

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

  const avatarUrl = user?.avatarUrl ?? (user?.email ? getGravatarUrl(user?.email) : '');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex p-0 text-sm rounded-full shadow-none dark:bg-transparent ring-transparent hover:bg-transparent focus:ring-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt="@shadcn" />
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
            Acount
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
