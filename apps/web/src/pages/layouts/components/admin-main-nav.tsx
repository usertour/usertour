import { useAppContext } from '@/contexts/app-context';
import { Button } from '@usertour/button';
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
} from '@usertour/icons';
import { TooltipContent } from '@usertour/tooltip';
import { TooltipTrigger } from '@usertour/tooltip';
import { TooltipProvider } from '@usertour/tooltip';
import { Tooltip } from '@usertour/tooltip';
import { cn } from '@usertour/tailwind';
import { Link, useLocation } from 'react-router-dom';
import { AdminEnvSwitcher } from './admin-env-switcher';
import { AdminUserNav } from './admin-user-nav';

// Extract common button styles to reduce repetition
const commonButtonStyles =
  'inline-flex main-transition items-center justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border dark:hover:border-dark-accent hover:shadow hover:border-input hover:bg-background !text-foreground hover:!text-foreground dark:!text-foreground dark:hover:!text-dark-accent-foreground h-9 w-9 p-0 relative unstyled-button border-transparent shadow-none bg-transparent dark:shadow-none dark:bg-transparent dark:hover:bg-secondary';

// Extract common icon styles
const commonIconStyles = '!h-[18px] !w-[18px] text-primary-modified dark:text-foreground/[60%]';

// Active state matches against the current pathname. Each entry's regex
// covers the list page plus any per-resource detail / builder / localisation
// page that conceptually belongs to the same top-level nav.
const navigations = [
  {
    name: 'Flows',
    href: '/flows',
    match: /^\/env\/[^/]+\/flows(\/|$)/,
    icon: FlowIcon,
  },
  {
    name: 'Launchers',
    href: '/launchers',
    match: /^\/env\/[^/]+\/launchers(\/|$)/,
    icon: LauncherIcon,
  },
  {
    name: 'Checklists',
    href: '/checklists',
    match: /^\/env\/[^/]+\/checklists(\/|$)/,
    icon: ChecklistIcon,
  },
  {
    name: 'Banners',
    href: '/banners',
    match: /^\/env\/[^/]+\/banners(\/|$)/,
    icon: BannerIcon,
  },
  {
    name: 'Event trackers',
    href: '/trackers',
    match: /^\/env\/[^/]+\/trackers(\/|$)/,
    icon: EventTrackerIcon,
  },
  {
    name: 'Resource Centers',
    href: '/resource-centers',
    match: /^\/env\/[^/]+\/resource-centers(\/|$)/,
    icon: ResourceCenterIcon,
  },
  {
    name: 'Users',
    href: '/users',
    // Covers /users list, /user/:id detail, and /session/:id (user activity).
    match: /^\/env\/[^/]+\/(users?|session)(\/|$)/,
    icon: GroupIcon2,
  },
  {
    name: 'Companies',
    href: '/companies',
    match: /^\/env\/[^/]+\/(companies|company)(\/|$)/,
    icon: CompanyIcon,
  },
  {
    name: 'Settings',
    href: '/settings/themes',
    match: /^\/project\/[^/]+\/settings(\/|$)/,
    icon: SettingsIcon,
  },
];

type NavItem = (typeof navigations)[number];

// Create a reusable NavButton component
const NavButton = ({
  isActive,
  icon: Icon,
  name,
  ...props
}: {
  isActive: boolean;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
} & React.HTMLAttributes<HTMLButtonElement>) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(commonButtonStyles, isActive ? 'bg-background shadow border-input' : '')}
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

  const isNavActive = (nav: NavItem) => nav.match.test(pathname);

  const getNavPath = (nav: NavItem) =>
    nav.name === 'Settings'
      ? `/project/${project?.id}${nav.href}`
      : `/env/${environment?.id}${nav.href}`;

  return (
    <div className="pt-5 pb-3 px-2 items-center flex flex-col min-h-screen flex-shrink-0">
      <AdminEnvSwitcher />

      <div className="flex flex-col justify-between gap-3 h-full">
        <div className="flex flex-col gap-3 mt-6">
          {navigations
            .filter((nav) => nav.name !== 'Settings')
            .map((nav, index) => (
              <Link to={getNavPath(nav)} key={index}>
                <NavButton name={nav.name} isActive={isNavActive(nav)} icon={nav.icon} {...props} />
              </Link>
            ))}
        </div>
        <div className="flex flex-col gap-3">
          {navigations
            .filter((nav) => nav.name === 'Settings')
            .map((nav, index) => (
              <Link to={getNavPath(nav)} key={index}>
                <NavButton name={nav.name} isActive={isNavActive(nav)} icon={nav.icon} {...props} />
              </Link>
            ))}
          <AdminUserNav />
        </div>
      </div>
    </div>
  );
};

AdminMainNewNav.displayName = 'AdminMainNewNav';
