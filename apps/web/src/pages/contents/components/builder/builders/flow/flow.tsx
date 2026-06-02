import { Route, Routes } from 'react-router-dom';
import { BuilderSideBar } from './sidebar';
import { FlowBuilderDetail } from './flow-detail';
import { FlowBuilderTrigger } from './flow-trigger';

// The Flow builder — a descendant `<Routes>` under the builder route's `/*`
// routing its sub-views. The URL is the source of truth for which sub-view is
// open; each route component seeds its edit buffer from the route param via
// useSeedStepFromRoute. Relative paths so they resolve under the builder base.
export const FlowBuilder = () => (
  <Routes>
    <Route index element={<BuilderSideBar />} />
    <Route path="step/new/:type" element={<FlowBuilderDetail />} />
    <Route path="step/:index" element={<FlowBuilderDetail />} />
    <Route path="trigger/:index" element={<FlowBuilderTrigger />} />
  </Routes>
);

FlowBuilder.displayName = 'FlowBuilder';
