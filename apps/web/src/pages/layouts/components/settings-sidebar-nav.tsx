'use client';

import AdminSidebarFooter from '@/components/molecules/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { useAppContext } from '@/contexts/app-context';
import {
  ColorIcon,
  BoxIcon,
  AttributeIcon,
  TeamIcon,
  AccountIcon,
  FlashlightIcon,
  BankCardIcon,
  ProjectIcon,
  // PlugIcon,
  KeyIcon,
} from '@usertour/icons';
import { Capability, GlobalConfig } from '@usertour/types';
import { useLocation, useNavigate } from 'react-router-dom';

// Constants
const ICON_CLASS_NAME = 'w-4 h-4';

enum Mode {
  CLOUD = 'cloud',
  SELF_HOSTED = 'self-hosted',
}

// Types
enum SidebarNavItemType {
  GENERAL = 'general',
  DEVELOPER = 'developer',
}

interface SidebarNavItem {
  title: string;
  href: string;
  /** Capability the active-project role must hold to see this item. Omit for items
   *  that aren't project-scoped (e.g. personal Account settings → always visible). */
  capability?: Capability;
  type: SidebarNavItemType;
  icon: React.ReactNode;
  mode: readonly Mode[];
  visible?: (globalConfig: GlobalConfig | undefined) => boolean;
}

// Components
interface NavItemProps {
  item: SidebarNavItem;
  isActive: boolean;
  onClick: () => void;
}

const NavItem = ({ item, isActive, onClick }: NavItemProps) => (
  <AdminSidebarBodyItemTemplate
    onClick={onClick}
    variant={isActive ? 'secondary' : 'ghost'}
    className={`w-full justify-start gap-1 ${
      isActive ? 'bg-gray-200/40 dark:bg-secondary/60' : ''
    }`}
  >
    {item.icon}
    {item.title}
  </AdminSidebarBodyItemTemplate>
);

interface NavSectionProps {
  title: string;
  items: SidebarNavItem[];
  currentPath: string;
  onNavigate: (href: string) => void;
}

const NavSection = ({ title, items, currentPath, onNavigate }: NavSectionProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <AdminSidebarBodyTitleTemplate>{title}</AdminSidebarBodyTitleTemplate>
      {items.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={currentPath.startsWith(item.href)}
          onClick={() => onNavigate(item.href)}
        />
      ))}
    </>
  );
};

// Data
const sidebarNavItems: readonly SidebarNavItem[] = [
  {
    title: 'Project',
    href: '/settings/general',
    capability: Capability.ProjectManage,
    type: SidebarNavItemType.GENERAL,
    icon: <ProjectIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Themes',
    href: '/settings/themes',
    capability: Capability.ThemeRead,
    type: SidebarNavItemType.GENERAL,
    icon: <ColorIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Environments',
    href: '/settings/environments',
    capability: Capability.EnvironmentRead,
    type: SidebarNavItemType.GENERAL,
    icon: <BoxIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Attributes',
    href: '/settings/attributes',
    capability: Capability.AttributeRead,
    type: SidebarNavItemType.GENERAL,
    icon: <AttributeIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Events',
    href: '/settings/events',
    capability: Capability.EventRead,
    type: SidebarNavItemType.GENERAL,
    icon: <FlashlightIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Team',
    href: '/settings/team',
    capability: Capability.TeamRead,
    type: SidebarNavItemType.GENERAL,
    icon: <TeamIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Billing',
    href: '/settings/billing',
    capability: Capability.BillingRead,
    type: SidebarNavItemType.GENERAL,
    icon: <BankCardIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD],
  },
  {
    title: 'Subscription',
    href: '/settings/subscription',
    capability: Capability.BillingRead,
    type: SidebarNavItemType.GENERAL,
    icon: <BankCardIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.SELF_HOSTED],
    visible: (globalConfig) => globalConfig?.allowProjectLevelSubscriptionManagement === true,
  },
  {
    title: 'Account',
    href: '/settings/account',
    // Personal account settings — not project-scoped, always visible.
    type: SidebarNavItemType.GENERAL,
    icon: <AccountIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'API',
    href: '/settings/api',
    capability: Capability.AccessTokenRead,
    type: SidebarNavItemType.DEVELOPER,
    icon: <KeyIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  // {
  //   title: 'Integrations',
  //   href: '/settings/integrations',
  //   capability: Capability.IntegrationManage,
  //   type: SidebarNavItemType.DEVELOPER,
  //   icon: <PlugIcon className={ICON_CLASS_NAME} />,
  // },
] as const;

export const SettingsSidebarNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { project, globalConfig, can } = useAppContext();

  const isSelfHosted = globalConfig?.isSelfHostedMode;
  const currentMode = isSelfHosted ? Mode.SELF_HOSTED : Mode.CLOUD;

  const filteredItems = sidebarNavItems
    .map((item) => ({
      ...item,
      href: `/project/${project?.id}${item.href}`,
    }))
    .filter((item) => {
      // Project-scoped items gate on the active-project capability; items without
      // a capability (personal Account settings) are always shown.
      if (item.capability && !can(item.capability)) {
        return false;
      }

      if (!item.mode.includes(currentMode)) {
        return false;
      }

      if (item.visible && !item.visible(globalConfig)) {
        return false;
      }

      return true;
    });

  const generalItems = filteredItems.filter((item) => item.type === SidebarNavItemType.GENERAL);
  const developerItems = filteredItems.filter((item) => item.type === SidebarNavItemType.DEVELOPER);

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-lg font-semibold">Settings</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <NavSection
          title="General"
          items={generalItems}
          currentPath={location.pathname}
          onNavigate={handleNavigate}
        />
        <div className="h-2" />
        <NavSection
          title="Advanced"
          items={developerItems}
          currentPath={location.pathname}
          onNavigate={handleNavigate}
        />
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
};

SettingsSidebarNav.displayName = 'SettingsSidebarNav';
