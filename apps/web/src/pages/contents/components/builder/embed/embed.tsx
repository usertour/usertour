import { Route, Routes } from 'react-router-dom';
import { EmbedSideBar } from '@/pages/contents/components/builder/embed/sidebar';
import { EmbedBuilderDetail } from '@/pages/contents/components/builder/embed/embed-detail';
import { EmbedTarget } from '@/pages/contents/components/builder/embed/embed-target';
import {
  EmbedOverviewCanvas,
  EmbedStepCanvas,
} from '@/pages/contents/components/builder/embed/components/embed-canvas';
import { FlowBuilderTrigger } from '@/pages/contents/components/builder/flow/flow-trigger';
import { FlowSidebarLayout } from '@/pages/contents/components/builder/flow/sidebar-layout';

// The Embed builder: the flow builder's skeleton (the same panel layout and
// routes, since its body is steps) with the shell settings on the overview
// and an inline canvas that stays visible on every view — the overview shows
// the first step in the shell so placement edits are seen in place.
export const EmbedBuilder = () => (
  <>
    <Routes>
      <Route element={<FlowSidebarLayout />}>
        <Route index element={<EmbedSideBar />} />
        <Route path="target" element={<EmbedTarget />} />
        <Route path="step/new/:type" element={<EmbedBuilderDetail />} />
        <Route path="step/:stepId" element={<EmbedBuilderDetail />} />
        <Route path="trigger/:stepId" element={<FlowBuilderTrigger />} />
      </Route>
    </Routes>
    <Routes>
      <Route index element={<EmbedOverviewCanvas />} />
      <Route path="target" element={<EmbedOverviewCanvas />} />
      <Route path="trigger/:stepId" element={<EmbedOverviewCanvas />} />
      <Route path="step/new/:type" element={<EmbedStepCanvas />} />
      <Route path="step/:stepId" element={<EmbedStepCanvas />} />
    </Routes>
  </>
);

EmbedBuilder.displayName = 'EmbedBuilder';
