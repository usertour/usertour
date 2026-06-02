import { Route, Routes } from 'react-router-dom';
import { useAutoSidebarPosition } from '../../hooks/use-auto-sidebar-position';
import { ChecklistCore } from './checklist-core';
import { ChecklistItem } from './checklist-item';
import { ChecklistEmbed } from './components/checklist-embed';

// The Checklist builder — a descendant `<Routes>` under the builder route's
// `/*` routing its sub-views. The URL owns which sub-view is open;
// ChecklistItem seeds its currentItem draft from currentVersion by the
// :itemId param on mount. The preview embed sits OUTSIDE <Routes> so it stays
// mounted across sub-view switches.
export const ChecklistBuilder = () => {
  // Auto-adjust sidebar position when the checklist position overlaps.
  useAutoSidebarPosition();
  return (
    <>
      <Routes>
        <Route index element={<ChecklistCore />} />
        <Route path="item/:itemId" element={<ChecklistItem />} />
      </Routes>
      <ChecklistEmbed />
    </>
  );
};

ChecklistBuilder.displayName = 'ChecklistBuilder';
