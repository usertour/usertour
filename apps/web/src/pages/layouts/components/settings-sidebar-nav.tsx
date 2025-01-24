"use client";

import { useLocation, useNavigate } from "react-router-dom";
import {
  AdminSidebarBodyTemplate,
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from "@/components/templates/admin-sidebar-template";
import AdminSidebarFooter from "@/components/molecules/admin-sidebar-footer";
import { useAppContext } from "@/contexts/app-context";

const sidebarNavItems = [
  {
    title: "Themes",
    href: "/settings/themes",
  },
  {
    title: "Environments",
    href: "/settings/environments",
  },
  // {
  //   title: "Localization",
  //   href: "/settings/localizations",
  // },
  {
    title: "Attributes",
    href: "/settings/attributes",
  },
  {
    title: "Events",
    href: "/settings/events",
  },
  {
    title: "Account",
    href: "/settings/account",
  },
];

export const SettingsSidebarNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { project } = useAppContext();
  const items = sidebarNavItems.map((it) => {
    const href = `/project/${project?.id}${it.href}`;
    return { ...it, href };
  });

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-lg font-semibold ">Project Settings</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>General</AdminSidebarBodyTitleTemplate>
        {items.map((item, index) => (
          <AdminSidebarBodyItemTemplate
            key={index}
            onClick={() => {
              navigate(item.href);
            }}
            variant={location.pathname === item.href ? "secondary" : "ghost"}
            className={`w-full justify-start ${
              location.pathname === item.href
                ? "bg-gray-200/40 dark:bg-secondary/60  "
                : ""
            }`}
          >
            {item.title}
          </AdminSidebarBodyItemTemplate>
        ))}
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
};

SettingsSidebarNav.displayName = "SettingsSidebarNav";
