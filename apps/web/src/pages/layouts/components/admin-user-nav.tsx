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
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  useToast,
} from '@usertour/ui';
import {
  RiAccountCircle2Line,
  RiBox1Line,
  RiComputerLine,
  RiContrast2Line,
  RiFlashlightLine,
  RiLogoutBoxRLine,
  RiMoonClearLine,
  RiPaletteLine,
  RiProjectorLine,
  RiShieldUserLine,
  RiSunLine,
} from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { useActiveUserProjectMutation } from '@usertour/hooks';
import isHotkey from 'is-hotkey';
import { usePostHog } from 'posthog-js/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEvent } from 'react-use';
import { type Theme, useTheme } from '@/contexts/theme-context';

// Theme switcher rendered as a segmented control on one row inside the user
// menu: three icon buttons (system / light / dark). The active mode stays
// visible and is switchable in a single click, without a submenu and without
// closing the menu.
const APPEARANCE_OPTIONS = [
  { value: 'system', icon: RiComputerLine, labelKey: 'common.appearance.system' },
  { value: 'light', icon: RiSunLine, labelKey: 'common.appearance.light' },
  { value: 'dark', icon: RiMoonClearLine, labelKey: 'common.appearance.dark' },
] satisfies ReadonlyArray<{ value: Theme; icon: typeof RiSunLine; labelKey: string }>;

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
            <RiAccountCircle2Line className="mr-2 h-4 w-4" />
            {t('settings.nav.sections.account')}
            <DropdownMenuShortcut>⌘U</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/project/${project?.id}/settings/themes`)}>
            <RiPaletteLine className="mr-2 h-4 w-4" />
            {t('settings.nav.sections.themes')}
            <DropdownMenuShortcut>⌘M</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/project/${project?.id}/settings/events`)}>
            <RiFlashlightLine className="mr-2 h-4 w-4" />
            {t('settings.nav.sections.events')}
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate(`/project/${project?.id}/settings/environments`)}
          >
            <RiBox1Line className="mr-2 h-4 w-4" />
            {t('settings.nav.sections.environments')}
          </DropdownMenuItem>
          {globalConfig?.isSelfHostedMode && user?.isSystemAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/general')}>
                <RiShieldUserLine className="mr-2 h-4 w-4" />
                {t('userNav.systemAdmin')}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <RiProjectorLine className="mr-2 h-4 w-4" />
              {t('userNav.myProjects')}
            </DropdownMenuSubTrigger>
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
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center">
              <RiContrast2Line className="mr-2 h-4 w-4" />
              <span className="text-sm">{t('common.appearance.label')}</span>
            </div>
            <div className="flex items-center gap-0.5">
              {APPEARANCE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={t(option.labelKey)}
                    aria-pressed={isActive}
                    onClick={(event) => {
                      event.stopPropagation();
                      setTheme(option.value);
                    }}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logoutHandler}>
          <RiLogoutBoxRLine className="mr-2 h-4 w-4" />
          {t('userNav.logout')}
          <DropdownMenuShortcut>⇧⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

AdminUserNav.displayName = 'AdminUserNav';
