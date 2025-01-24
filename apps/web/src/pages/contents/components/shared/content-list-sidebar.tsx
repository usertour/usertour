import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from "@/components/templates/admin-sidebar-template";
import AdminSidebarFooter from "@/components/molecules/admin-sidebar-footer";
import { useContentListContext } from "@/contexts/content-list-context";
import { useParams, useSearchParams } from "react-router-dom";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ContentListSidebar({ className }: SidebarProps) {
  const { query, setQuery } = useContentListContext();
  const { contentType } = useParams();
  const [_, setSearchParams] = useSearchParams();

  // Extract common styles and logic
  const getItemClassName = (isActive: boolean) =>
    isActive ? "bg-gray-200/40 dark:bg-secondary/60" : "";

  const handleStatusChange = (published: boolean) => () => {
    setQuery({ published });
    setSearchParams({});
  };

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-2xl font-semibold">
          {contentType == "flows" && "Flows"}
          {contentType == "launchers" && "Launchers"}
          {contentType == "checklists" && "Checklists"}
        </h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>Status</AdminSidebarBodyTitleTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={handleStatusChange(false)}
          variant={query.published === false ? "secondary" : "ghost"}
          className={getItemClassName(query.published === false)}
        >
          Draft
        </AdminSidebarBodyItemTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={handleStatusChange(true)}
          variant={query.published === true ? "secondary" : "ghost"}
          className={getItemClassName(query.published === true)}
        >
          Published
        </AdminSidebarBodyItemTemplate>
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
}

ContentListSidebar.displayName = "ContentListSidebar";
