import {
  ChecklistContainer,
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistPopper,
  ChecklistPopperContent,
  ChecklistProgress,
  ChecklistRoot,
} from '@usertour-ui/sdk/src/checklist';
import { PopperMadeWith } from '@usertour-ui/sdk/src/popper';
import { ChecklistData, ChecklistInitialDisplay, ThemeTypesSetting } from '@usertour-ui/types';
import { useEffect, useState } from 'react';
import { defaultChecklistData } from '@/utils/theme';

interface ThemePreviewChecklistProps {
  expanded?: boolean;
  settings?: ThemeTypesSetting;
  containerHeight?: number;
}

export const ThemePreviewChecklist = (props: ThemePreviewChecklistProps) => {
  const { expanded = true, settings, containerHeight } = props;

  const [data] = useState<ChecklistData>({
    ...defaultChecklistData,
    initialDisplay: expanded ? ChecklistInitialDisplay.EXPANDED : ChecklistInitialDisplay.BUTTON,
  });

  if (!settings) return null;

  const [expandedState, setExpandedState] = useState(expanded);

  useEffect(() => {
    setExpandedState(expanded);
  }, [expanded]);

  return (
    <div
      className="w-full"
      style={{
        transform: 'scale(1)',
        height: containerHeight ? `${containerHeight}px` : '100%',
      }}
    >
      <div className="flex flex-row items-center justify-center h-full scale-100">
        <ChecklistRoot
          data={data}
          expanded={expandedState}
          themeSettings={settings}
          zIndex={10000}
          onExpandedChange={setExpandedState}
        >
          <ChecklistContainer>
            <ChecklistPopper zIndex={10000}>
              <ChecklistPopperContent>
                <ChecklistDropdown />
                <ChecklistProgress />
                <ChecklistItems />
                <ChecklistDismiss />
                <PopperMadeWith />
              </ChecklistPopperContent>
            </ChecklistPopper>
          </ChecklistContainer>
        </ChecklistRoot>
      </div>
    </div>
  );
};

ThemePreviewChecklist.displayName = 'ThemePreviewChecklist';
