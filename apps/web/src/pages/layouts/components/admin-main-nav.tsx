import { useAppContext } from '@/contexts/app-context';
import { Button, TooltipContent, TooltipTrigger, TooltipProvider, Tooltip } from '@usertour/ui';
import {
  ChecklistIcon,
  CompanyIcon,
  FlowIcon,
  GroupIcon2,
  LauncherIcon,
  SettingsIcon,
  BannerIcon,
  EventTrackerIcon,
  ResourceCenterIcon,
  AnnouncementIcon,
} from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminEnvSwitcher } from './admin-env-switcher';
import { AdminUserNav } from './admin-user-nav';

// Extract common button styles to reduce repetition
const commonButtonStyles =
  'inline-flex main-transition items-center justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border dark:hover:border-dark-accent hover:shadow hover:border-input hover:bg-background dark:bg-muted !text-foreground hover:!text-foreground dark:!text-foreground dark:hover:!text-dark-accent-foreground h-9 w-9 p-0 relative unstyled-button border-transparent shadow-none bg-transparent dark:shadow-none dark:bg-transparent dark:hover:bg-secondary';

// Extract common icon styles
const commonIconStyles = '!h-[18px] !w-[18px] text-primary-modified dark:text-foreground/[60%]';

// Active state matches against the current pathname. Each entry's regex
// covers the list page plus any per-resource detail / builder / localisation
// page that conceptually belongs to the same top-level nav.
//
// nameKey is a react-i18next translation key resolved at render time;
// keeping this array module-level avoids calling hooks outside components.
const navigations = [
  {
    nameKey: 'contents.list.flows.title',
    id: 'flows',
    href: '/flows',
    match: /^\/env\/[^/]+\/flows(\/|$)/,
    icon: FlowIcon,
  },
  {
    nameKey: 'contents.list.launchers.title',
    id: 'launchers',
    href: '/launchers',
    match: /^\/env\/[^/]+\/launchers(\/|$)/,
    icon: LauncherIcon,
  },
  {
    nameKey: 'contents.list.checklists.title',
    id: 'checklists',
    href: '/checklists',
    match: /^\/env\/[^/]+\/checklists(\/|$)/,
    icon: ChecklistIcon,
  },
  {
    nameKey: 'contents.list.banners.title',
    id: 'banners',
    href: '/banners',
    match: /^\/env\/[^/]+\/banners(\/|$)/,
    icon: BannerIcon,
  },
  {
    nameKey: 'contents.list.trackers.title',
    id: 'trackers',
    href: '/trackers',
    match: /^\/env\/[^/]+\/trackers(\/|$)/,
    icon: EventTrackerIcon,
  },
  {
    nameKey: 'contents.list.resourceCenters.title',
    id: 'resourceCenters',
    href: '/resource-centers',
    match: /^\/env\/[^/]+\/resource-centers(\/|$)/,
    icon: ResourceCenterIcon,
  },
  {
    nameKey: 'contents.list.announcements.title',
    id: 'announcements',
    href: '/announcements',
    match: /^\/env\/[^/]+\/announcements(\/|$)/,
    icon: AnnouncementIcon,
  },
  {
    nameKey: 'users.detail.breadcrumb',
    id: 'users',
    href: '/users',
    // Covers /users list, /user/:id detail, and /session/:id (user activity).
    match: /^\/env\/[^/]+\/(users?|session)(\/|$)/,
    icon: GroupIcon2,
  },
  {
    nameKey: 'companies.detail.breadcrumb',
    id: 'companies',
    href: '/companies',
    match: /^\/env\/[^/]+\/(companies|company)(\/|$)/,
    icon: CompanyIcon,
  },
  {
    nameKey: 'settings.nav.heading',
    id: 'settings',
    href: '/settings/themes',
    match: /^\/project\/[^/]+\/settings(\/|$)/,
    icon: SettingsIcon,
  },
];

type NavItem = (typeof navigations)[number];

interface NavButtonProps {
  isActive: boolean;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
}

// Create a reusable NavButton component
const NavButton = ({
  isActive,
  icon: Icon,
  name,
  ...props
}: NavButtonProps & React.HTMLAttributes<HTMLButtonElement>) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            commonButtonStyles,
            isActive ? 'bg-background dark:bg-muted shadow border-input' : '',
          )}
          {...props}
        >
          <Icon className={cn(commonIconStyles, isActive ? 'text-primary' : '')} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{name}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const AdminMainNewNav = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  const { pathname } = useLocation();
  const { environment, project } = useAppContext();
  const { t } = useTranslation();

  const isNavActive = (nav: NavItem) => nav.match.test(pathname);

  const getNavPath = (nav: NavItem) =>
    nav.id === 'settings'
      ? `/project/${project?.id}${nav.href}`
      : `/env/${environment?.id}${nav.href}`;

  return (
    <div className="pt-5 pb-3 px-2 items-center flex flex-col min-h-screen flex-shrink-0">
      <AdminEnvSwitcher />

      <div className="flex flex-col justify-between gap-3 h-full">
        <div className="flex flex-col gap-3 mt-6">
          {navigations
            .filter((nav) => nav.id !== 'settings')
            .map((nav, index) => (
              <Link to={getNavPath(nav)} key={index}>
                <NavButton
                  name={t(nav.nameKey)}
                  isActive={isNavActive(nav)}
                  icon={nav.icon}
                  {...props}
                />
              </Link>
            ))}
        </div>
        <div className="flex flex-col gap-3">
          {navigations
            .filter((nav) => nav.id === 'settings')
            .map((nav, index) => (
              <Link to={getNavPath(nav)} key={index}>
                <NavButton
                  name={t(nav.nameKey)}
                  isActive={isNavActive(nav)}
                  icon={nav.icon}
                  {...props}
                />
              </Link>
            ))}
          <AdminUserNav />
        </div>
      </div>
    </div>
  );
};

AdminMainNewNav.displayName = 'AdminMainNewNav';
