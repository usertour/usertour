import { Route, Routes } from 'react-router-dom';
import { BuilderSideBar } from '@/pages/contents/components/builder/flow/sidebar';
import {
  FlowBuilderDetail,
  FlowBuilderDetailEmbed,
} from '@/pages/contents/components/builder/flow/flow-detail';
import { FlowBuilderTrigger } from '@/pages/contents/components/builder/flow/flow-trigger';
import { FlowSidebarLayout } from '@/pages/contents/components/builder/flow/sidebar-layout';

// The Flow builder. FlowSidebarLayout is a persistent layout route that holds
// the floating panel chrome (and animates its width); the matched sub-view
// renders into its <Outlet/>, so navigation swaps only the inner content. The
// canvas preview is a separate, route-driven layer outside the panel (step
// views only). The URL is the source of truth.
export const FlowBuilder = () => (
  <>
    <Routes>
      <Route element={<FlowSidebarLayout />}>
        <Route index element={<BuilderSideBar />} />
        <Route path="step/new/:type" element={<FlowBuilderDetail />} />
        <Route path="step/:stepId" element={<FlowBuilderDetail />} />
        <Route path="trigger/:stepId" element={<FlowBuilderTrigger />} />
      </Route>
    </Routes>
    <Routes>
      <Route path="step/new/:type" element={<FlowBuilderDetailEmbed />} />
      <Route path="step/:stepId" element={<FlowBuilderDetailEmbed />} />
    </Routes>
  </>
);

FlowBuilder.displayName = 'FlowBuilder';
