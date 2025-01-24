import { cn } from "@usertour-ui/ui-utils";
import { Button } from "@usertour-ui/button";
import { useSegmentListContext } from "@/contexts/segment-list-context";
import { useSearchParams } from "react-router-dom";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Segment } from "@usertour-ui/types";
import {
  FilterIcon2,
  UserIcon3,
  GroupIcon2,
  PLUSIcon,
} from "@usertour-ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";
import { UserSegmentCreateForm } from "./create-form";
import {
  AdminSidebarBodyTemplate,
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from "@/components/templates/admin-sidebar-template";
import AdminSidebarFooter from "@/components/molecules/admin-sidebar-footer";

export const UserListSidebar = () => {
  const { segmentList, refetch, environmentId, currentSegment } =
    useSegmentListContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [open, setOpen] = useState(false);
  const handleCreate = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };

  const handleOnClick = useCallback(
    (segment: Segment) => {
      if (currentSegment && segment.id == currentSegment.id) {
        return;
      }
      setSearchParams({ segment_id: segment.id });
    },
    [currentSegment?.id]
  );

  return (
    <>
      <AdminSidebarContainerTemplate>
        <AdminSidebarHeaderTemplate>
          <h2 className="text-2xl font-semibold ">Users</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"ghost"}
                  className="p-1 h-auto text-primary"
                  onClick={handleCreate}
                >
                  <PLUSIcon width={16} height={16} /> New
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-slate-700">
                <p>Create user segment</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </AdminSidebarHeaderTemplate>
        <AdminSidebarBodyTemplate>
          <AdminSidebarBodyTitleTemplate>
            Segments
          </AdminSidebarBodyTitleTemplate>
          {segmentList &&
            segmentList.map((segment, index) => (
              <Fragment key={index}>
                <AdminSidebarBodyItemTemplate
                  variant={
                    segment.id == currentSegment?.id ? "secondary" : "ghost"
                  }
                  className={
                    segment.id == currentSegment?.id
                      ? "bg-gray-200/40 dark:bg-secondary/60  "
                      : ""
                  }
                  onClick={() => {
                    handleOnClick(segment);
                  }}
                >
                  {segment.dataType == "CONDITION" && (
                    <FilterIcon2 width={16} height={16} className="mr-1" />
                  )}
                  {segment.dataType == "ALL" && (
                    <GroupIcon2 width={16} height={16} className="mr-1" />
                  )}
                  {segment.dataType == "MANUAL" && (
                    <UserIcon3 width={16} height={16} className="mr-1" />
                  )}
                  {segment.name}
                </AdminSidebarBodyItemTemplate>
              </Fragment>
            ))}
        </AdminSidebarBodyTemplate>
        <AdminSidebarFooter />
      </AdminSidebarContainerTemplate>
      <UserSegmentCreateForm
        isOpen={open}
        onClose={handleOnClose}
        environmentId={environmentId}
      />
    </>
  );
};

UserListSidebar.displayName = "UserListSidebar";
