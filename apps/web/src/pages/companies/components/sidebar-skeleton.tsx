import { Skeleton } from '@usertour-ui/skeleton';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
} from '@/components/templates/admin-sidebar-template';

// Skeleton for individual segment item
export const CompanySegmentItemSkeleton = () => {
  return (
    <AdminSidebarBodyItemTemplate variant="ghost" className="cursor-default">
      <Skeleton className="h-4 w-4 mr-1" /> {/* Icon skeleton */}
      <Skeleton className="h-4 w-32" /> {/* Segment name skeleton */}
    </AdminSidebarBodyItemTemplate>
  );
};

// Skeleton for the segment list section only
export const CompanySegmentListSkeleton = () => {
  return (
    <AdminSidebarBodyTemplate>
      <AdminSidebarBodyTitleTemplate>Segments</AdminSidebarBodyTitleTemplate>
      {Array.from({ length: 5 }, (_, index) => (
        <CompanySegmentItemSkeleton key={index} />
      ))}
    </AdminSidebarBodyTemplate>
  );
};
