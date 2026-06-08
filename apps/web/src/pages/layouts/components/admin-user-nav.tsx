import { useAppContext } from '@/contexts/app-context';
import {
  UserAvatar,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuSelectItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  useToast,
} from '@usertour/ui';
import { RiComputerLine, RiMoonClearLine, RiSunLine } from '@usertour/icons';
import { useActiveUserProjectMutation } from '@usertour/hooks';
import isHotkey from 'is-hotkey';
import { usePostHog } from 'posthog-js/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEvent } from 'react-use';
import { type Theme, useTheme } from '@/contexts/theme-context';

export const AdminUserNav = () => {
  const { userInfo: user, signOutAndRedirect, globalConfig } = useAppContext();
  const { project, projects } = useAppContext();
  const posthog = usePostHog();
  const { invoke } = useActiveUserProjectMutation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const navigate = useNavigate();

  const logoutHandler = () => {
    posthog?.capture('clicked_log_in');
    signOutAndRedirect();
  };

  const hotkeys = {
    'mod+u': `/project/${project?.id}/settings/account`,
    'mod+m': `/project/${project?.id}/settings/themes`,
    'mod+e': `/project/${project?.id}/settings/events`,
    'shift+mod+k': '/auth/signin',
  };
  const handleKeyEvent = (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    for (const key in hotkeys) {
      const path = hotkeys[key as keyof typeof hotkeys];
      if (isHotkey(key, keyboardEvent)) {
        if (path === '/auth/signin') {
          logoutHandler();
        } else {
          navigate(path);
        }
      }
    }
  };
  useEvent('keydown', handleKeyEvent, window, { capture: true });

  const handleActiveProject = async (projectId: string | undefined) => {
    if (user?.id && projectId) {
      try {
        await invoke(user?.id, projectId);
        // Refresh the current page after successfully switching project
        window.location.reload();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('userNav.switchProjectFailed'),
        });
        console.error(error);
      }
    }
  };

  const activeProject = projects.find((p) => p.actived);
  const otherProjects = projects.filter((p) => !p.actived);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex p-0 text-sm rounded-full shadow-none dark:bg-transparent ring-transparent hover:bg-transparent focus:ring-0"
        >
          <UserAvatar email={user?.email || ''} name={user?.name} size="md" />
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
            {t('settings.nav.sections.account')}
            <DropdownMenuShortcut>⌘U</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/project/${project?.id}/settings/themes`)}>
            {t('settings.nav.sections.themes')}
            <DropdownMenuShortcut>⌘M</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/project/${project?.id}/settings/events`)}>
            {t('settings.nav.sections.events')}
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate(`/project/${project?.id}/settings/environments`)}
          >
            {t('settings.nav.sections.environments')}
          </DropdownMenuItem>
          {globalConfig?.isSelfHostedMode && user?.isSystemAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/general')}>
                {t('userNav.systemAdmin')}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('userNav.myProjects')}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuLabel className="text-xs	">
                  {t('userNav.currentProject')}
                </DropdownMenuLabel>
                {activeProject && (
                  <DropdownMenuItem
                    key={activeProject.id}
                    className="flex items-center justify-between cursor-pointer "
                    onClick={() => handleActiveProject(activeProject.id)}
                  >
                    <span className="truncate max-w-[120px]">{activeProject.name}</span>{' '}
                    {<Badge variant={'outline'}>{activeProject.role}</Badge>}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {otherProjects.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs">
                      {t('userNav.otherProjects')}
                    </DropdownMenuLabel>
                    {otherProjects.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        className="flex items-center justify-between cursor-pointer "
                        onClick={() => handleActiveProject(p.id)}
                      >
                        <span className="truncate max-w-[120px]">{p.name}</span>{' '}
                        {<Badge variant={'outline'}>{p.role}</Badge>}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('common.appearance.label')}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) => setTheme(value as Theme)}
                >
                  <DropdownMenuSelectItem value="light">
                    <RiSunLine className="mr-2 h-4 w-4" />
                    {t('common.appearance.light')}
                  </DropdownMenuSelectItem>
                  <DropdownMenuSelectItem value="dark">
                    <RiMoonClearLine className="mr-2 h-4 w-4" />
                    {t('common.appearance.dark')}
                  </DropdownMenuSelectItem>
                  <DropdownMenuSelectItem value="system">
                    <RiComputerLine className="mr-2 h-4 w-4" />
                    {t('common.appearance.system')}
                  </DropdownMenuSelectItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logoutHandler}>
          {t('userNav.logout')}
          <DropdownMenuShortcut>⇧⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

AdminUserNav.displayName = 'AdminUserNav';
