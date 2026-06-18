'use client';

import AdminSidebarFooter from '@/components/admin-sidebar/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/admin-sidebar/admin-sidebar-template';
import { useAppContext } from '@/contexts/app-context';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SETTINGS_SECTIONS,
  SettingsMode,
  type SettingsSection,
  type SettingsSectionGroup,
} from '@/pages/settings/registry';

interface NavItemProps {
  section: SettingsSection;
  href: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem = ({ section, isActive, onClick }: NavItemProps) => {
  const { t } = useTranslation();
  return (
    <AdminSidebarBodyItemTemplate
      onClick={onClick}
      variant={isActive ? 'secondary' : 'ghost'}
      className={`w-full justify-start gap-1 ${
        isActive ? 'bg-gray-200/40 dark:bg-secondary/60' : ''
      }`}
    >
      {section.icon}
      {t(`settings.nav.sections.${section.key}`)}
    </AdminSidebarBodyItemTemplate>
  );
};

interface NavSectionProps {
  title: string;
  items: { section: SettingsSection; href: string }[];
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
      {items.map(({ section, href }) => (
        <NavItem
          key={section.key}
          section={section}
          href={href}
          isActive={currentPath.startsWith(href)}
          onClick={() => onNavigate(href)}
        />
      ))}
    </>
  );
};

const GROUP_LABEL_KEY: Record<SettingsSectionGroup, string> = {
  general: 'settings.nav.general',
  developer: 'settings.nav.developer',
};

export const SettingsSidebarNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { project, globalConfig, can } = useAppContext();
  const { t } = useTranslation();

  const currentMode = globalConfig?.isSelfHostedMode
    ? SettingsMode.SELF_HOSTED
    : SettingsMode.CLOUD;

  const visibleItems = SETTINGS_SECTIONS.filter((section) => {
    if (section.hideFromSidebar) {
      return false;
    }
    if (section.capability && !can(section.capability)) {
      return false;
    }
    if (!section.mode.includes(currentMode)) {
      return false;
    }
    if (section.visible && !section.visible(globalConfig)) {
      return false;
    }
    return true;
  }).map((section) => ({
    section,
    href: `/project/${project?.id}/settings/${section.key}`,
  }));

  const generalItems = visibleItems.filter(({ section }) => section.group === 'general');
  const developerItems = visibleItems.filter(({ section }) => section.group === 'developer');

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-lg font-medium">{t('settings.nav.heading')}</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <NavSection
          title={t(GROUP_LABEL_KEY.general)}
          items={generalItems}
          currentPath={location.pathname}
          onNavigate={navigate}
        />
        <div className="h-2" />
        <NavSection
          title={t(GROUP_LABEL_KEY.developer)}
          items={developerItems}
          currentPath={location.pathname}
          onNavigate={navigate}
        />
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
};

SettingsSidebarNav.displayName = 'SettingsSidebarNav';
