import { useChecklistPreviewAnimation } from '@usertour-packages/shared-hooks';
import {
  ChecklistContainer,
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistPopper,
  ChecklistPopperContent,
  ChecklistProgress,
  ChecklistRoot,
} from '@usertour-packages/sdk/src/checklist';
import { PopperMadeWith } from '@usertour-packages/sdk/src/popper';
import { ChecklistData, ChecklistInitialDisplay, ThemeTypesSetting } from '@usertour/types';
import { useEffect, useMemo, useState } from 'react';
import { defaultChecklistData } from '@/utils/theme';
import { ContentEditorSerialize } from '@usertour-packages/shared-editor';

interface ThemePreviewChecklistProps {
  expanded?: boolean;
  settings?: ThemeTypesSetting;
}

export const ThemePreviewChecklist = (props: ThemePreviewChecklistProps) => {
  const { expanded = true, settings } = props;

  const [expandedState, setExpandedState] = useState(expanded);

  // Use shared hook for animation and completion state management
  const { completedItemIds, animatedItemIds, handleItemClick } =
    useChecklistPreviewAnimation(expandedState);

  // Compute data with dynamic isCompleted and isShowAnimation
  const data = useMemo<ChecklistData>(() => {
    return {
      ...defaultChecklistData,
      initialDisplay: expanded ? ChecklistInitialDisplay.EXPANDED : ChecklistInitialDisplay.BUTTON,
      items: defaultChecklistData.items.map((item) => ({
        ...item,
        isCompleted: completedItemIds.has(item.id),
        isShowAnimation: animatedItemIds.has(item.id),
      })),
    };
  }, [expanded, completedItemIds, animatedItemIds]);

  useEffect(() => {
    setExpandedState(expanded);
  }, [expanded]);

  if (!settings) return null;

  return (
    <div className="w-full h-full scale-100">
      <ChecklistRoot
        data={data}
        expanded={expandedState}
        themeSettings={settings}
        zIndex={10000}
        onExpandedChange={async (expanded: boolean) => {
          setExpandedState(expanded);
        }}
      >
        <ChecklistContainer>
          <ChecklistPopper zIndex={10000}>
            <ChecklistPopperContent>
              <ContentEditorSerialize contents={data.content} />
              <ChecklistDropdown />
              <ChecklistProgress />
              <ChecklistItems onClick={handleItemClick} disabledUpdate />
              <ChecklistDismiss />
              <PopperMadeWith />
            </ChecklistPopperContent>
          </ChecklistPopper>
        </ChecklistContainer>
      </ChecklistRoot>
    </div>
  );
};

ThemePreviewChecklist.displayName = 'ThemePreviewChecklist';
