import { useAppContext } from '@/contexts/app-context';
import { Button } from '@usertour-ui/button';
import {
  ChecklistIcon,
  CompanyIcon,
  FlowIcon,
  GroupIcon2,
  LauncherIcon,
  SettingsIcon,
} from '@usertour-ui/icons';
import { TooltipContent } from '@usertour-ui/tooltip';
import { TooltipTrigger } from '@usertour-ui/tooltip';
import { TooltipProvider } from '@usertour-ui/tooltip';
import { Tooltip } from '@usertour-ui/tooltip';
import { cn } from '@usertour-ui/ui-utils';
import { Link, useMatches, useParams } from 'react-router-dom';
import { AdminEnvSwitcher } from './admin-env-switcher';
import { AdminUserNav } from './admin-user-nav';

// Extract common button styles to reduce repetition
const commonButtonStyles =
  'inline-flex main-transition items-center justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border dark:hover:border-dark-accent hover:shadow hover:border-input hover:bg-background !text-foreground hover:!text-foreground dark:!text-foreground dark:hover:!text-dark-accent-foreground h-9 w-9 p-0 relative unstyled-button border-transparent shadow-none bg-transparent dark:shadow-none dark:bg-transparent dark:hover:bg-secondary';

// Extract common icon styles
const commonIconStyles = '!h-[18px] !w-[18px] text-primary-modified dark:text-foreground/[60%]';

const navigations = [
  {
    name: 'Flows',
    href: '/flows',
    contentType: 'flows',
    routeIds: ['content'],
    icon: FlowIcon,
  },
  {
    name: 'Launchers',
    href: '/launchers',
    contentType: 'launchers',
    routeIds: ['launchers'],
    icon: LauncherIcon,
  },
  {
    name: 'Checklists',
    href: '/checklists',
    contentType: 'checklists',
    routeIds: ['checklists'],
    icon: ChecklistIcon,
  },
  {
    name: 'Users',
    href: '/users',
    routeIds: ['users'],
    icon: GroupIcon2,
  },
  {
    name: 'Companies',
    href: '/companies',
    routeIds: ['companies'],
    icon: CompanyIcon,
  },
  {
    name: 'Settings',
    href: '/settings/themes',
    routeIds: [
      'settings',
      'settings-account',
      'settings-themes',
      'settings-environments',
      'settings-attributes',
      'settings-localizations',
      'settings-events',
    ],
    icon: SettingsIcon,
  },
];

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
  const matches = useMatches();
  const { environment, project } = useAppContext();
  const { contentType } = useParams();

  const isNavActive = (nav: (typeof navigations)[0]) =>
    nav.contentType
      ? nav.contentType === contentType
      : matches && nav.routeIds.includes(matches[0].id);

  const getNavPath = (nav: (typeof navigations)[0]) =>
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

export const AdminMainNav = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  const matches = useMatches();
  const { environment, project } = useAppContext();
  const { contentType } = useParams();

  return (
    <nav className={cn('flex items-center space-x-4 lg:space-x-6', className)} {...props}>
      {navigations.map((nav, index) => (
        <Link
          to={
            nav.name !== 'Settings'
              ? `/project/${project?.id}${nav.href}`
              : `/env/${environment?.id}${nav.href}`
          }
          key={index}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            (contentType === 'trackers' && nav.routeIds.includes(contentType)) ||
              (contentType !== 'trackers' && matches && nav.routeIds.includes(matches[0].id))
              ? ''
              : 'text-muted-foreground',
          )}
        >
          {nav.name}
        </Link>
      ))}
    </nav>
  );
};

AdminMainNav.displayName = 'AdminMainNav';
