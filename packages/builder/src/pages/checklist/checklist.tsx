import { BuilderMode, useBuilderContext } from '../../contexts';
import { useAutoSidebarPosition } from '../../hooks/use-auto-sidebar-position';
import { ChecklistCore } from './checklist-core';
import { ChecklistItem } from './checklist-item';
import { ChecklistEmbed } from './components/checklist-embed';

export const ChecklistBuilder = () => {
  const { currentMode } = useBuilderContext();

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
