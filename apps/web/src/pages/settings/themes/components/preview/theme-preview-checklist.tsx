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
import {
  ChecklistData,
  ChecklistInitialDisplay,
  ThemeTypesSetting,
} from '@usertour-packages/types';
import { useEffect, useState } from 'react';
import { defaultChecklistData } from '@/utils/theme';

interface ThemePreviewChecklistProps {
  expanded?: boolean;
  settings?: ThemeTypesSetting;
}

export const ThemePreviewChecklist = (props: ThemePreviewChecklistProps) => {
  const { expanded = true, settings } = props;

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
    <div className="w-full h-full scale-100">
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
  );
};

ThemePreviewChecklist.displayName = 'ThemePreviewChecklist';
