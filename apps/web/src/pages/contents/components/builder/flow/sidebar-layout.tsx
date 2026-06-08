'use client';

import { Outlet, useLocation } from 'react-router-dom';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar/floating-sidebar-panel';

// Persistent floating panel for every flow sub-view, used as a React Router
// layout route: it stays mounted while the matched child route renders into
// <Outlet/>, so the panel width and inner content transition smoothly instead
// of the whole panel being swapped on navigation. The floating chrome (side
// switch / collapse) lives in FloatingSidebarPanel, shared with the other
// content types.
export const FlowSidebarLayout = () => {
  const { pathname } = useLocation();
  // Trigger editing is denser (condition / action chips) so it gets a touch
  // more width; the other views use the standard panel width.
  const width = pathname.includes('/trigger/') ? 360 : 320;

  return (
    <FloatingSidebarPanel width={width}>
      <Outlet />
    </FloatingSidebarPanel>
  );
};
FlowSidebarLayout.displayName = 'FlowSidebarLayout';
