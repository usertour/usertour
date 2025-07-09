import { useThemeDetailContext } from '@/contexts/theme-detail-context';
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
import {
  ChecklistCompletionOrder,
  ChecklistData,
  ChecklistInitialDisplay,
} from '@usertour-ui/types';
import { useEffect, useState } from 'react';

interface ThemePreviewChecklistProps {
  expanded?: boolean;
}

export const ThemePreviewChecklist = (props: ThemePreviewChecklistProps) => {
  const { expanded = true } = props;
  const { theme, settings } = useThemeDetailContext();

  const [data] = useState<ChecklistData>({
    buttonText: 'Get Started',
    initialDisplay: expanded ? ChecklistInitialDisplay.EXPANDED : ChecklistInitialDisplay.BUTTON,
    completionOrder: ChecklistCompletionOrder.ANY,
    preventDismissChecklist: false,
    autoDismissChecklist: false,
    items: [
      {
        id: '1',
        name: 'First item',
        description: 'Checklist',
        clickedActions: [],
        completeConditions: [],
        onlyShowTask: false,
        isCompleted: false,
        onlyShowTaskConditions: [],
        isVisible: true,
      },
      {
        id: '2',
        name: 'Second item',
        description: 'Checklist',
        clickedActions: [],
        completeConditions: [],
        onlyShowTask: false,
        isCompleted: false,
        onlyShowTaskConditions: [],
        isVisible: true,
      },
      {
        id: '3',
        name: 'Third item',
        description: 'Checklist',
        clickedActions: [],
        completeConditions: [],
        onlyShowTask: false,
        isCompleted: false,
        onlyShowTaskConditions: [],
        isVisible: true,
      },
    ],
    content: [],
  });

  if (!settings) return null;

  const [expandedState, setExpandedState] = useState(expanded);

  useEffect(() => {
    setExpandedState(expanded);
  }, [expanded]);

  return (
    <div className="h-full w-full">
      <div className="flex flex-row items-center justify-center h-full scale-100	 ">
        <ChecklistRoot
          data={data}
          expanded={expandedState}
          theme={{ ...theme, settings }}
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
