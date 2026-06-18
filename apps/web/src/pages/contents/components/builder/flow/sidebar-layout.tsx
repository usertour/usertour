'use client';

import { Outlet } from 'react-router-dom';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar/floating-sidebar-panel';

// Persistent floating panel for every flow sub-view, used as a React Router
// layout route: it stays mounted while the matched child route renders into
// <Outlet/>, so navigation swaps only the inner content. The floating chrome
// (side switch / collapse) lives in FloatingSidebarPanel, shared with the
// other content types.
//
// One constant width for every sub-view — the trigger editor used to get
// 360 vs 320, but the per-view difference animated the panel frame while
// the new view's content reflowed mid-resize for 300ms on each navigation.
export const FlowSidebarLayout = () => {
  return (
    <FloatingSidebarPanel width={320}>
      <Outlet />
    </FloatingSidebarPanel>
  );
};
FlowSidebarLayout.displayName = 'FlowSidebarLayout';
