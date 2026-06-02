import { BuilderMode, useBuilderStore } from '../../core';
import { useAutoSidebarPosition } from '../../hooks/use-auto-sidebar-position';
import { ChecklistCore } from './checklist-core';
import { ChecklistItem } from './checklist-item';
import { ChecklistEmbed } from './components/checklist-embed';

export const ChecklistBuilder = () => {
  const currentMode = useBuilderStore((state) => state.currentMode);

  // Auto-adjust sidebar position when checklist position overlaps
  useAutoSidebarPosition();

  return (
    <>
      {currentMode?.mode === BuilderMode.CHECKLIST && <ChecklistCore />}
      {currentMode?.mode === BuilderMode.CHECKLIST_ITEM && <ChecklistItem />}
      <ChecklistEmbed />
    </>
  );
};

ChecklistBuilder.displayName = 'ChecklistBuilder';
