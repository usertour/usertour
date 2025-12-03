import { Attribute, ThemeTypesSetting } from '@usertour/types';
import { Button } from '@usertour-packages/button';
import { OutlineInput } from '@usertour-packages/input';
import { Delete2Icon } from '@usertour-packages/icons';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { Rules } from '@usertour-packages/shared-components';
import { ThemeSettingsPanel, ThemeSettingsAccordionContent } from './theme-settings-panel';
import { useEffect, useRef, useState } from 'react';
import isEqual from 'fast-deep-equal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

interface ModalThemeSettingsPanelProps {
  isViewOnly?: boolean;
  settings: ThemeTypesSetting;
  defaultSettings: ThemeTypesSetting;
  onSettingsChange: (settings: ThemeTypesSetting) => void;
  attributeList?: Attribute[];
  onConditionsChange?: (conditions: any[]) => void;
  initialConditions?: any[];

  // Modal specific props
  title?: string;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  errorMessage?: string;
  showError?: boolean;
}

export const ModalThemeSettingsPanel = ({
  settings,
  defaultSettings,
  onSettingsChange,
  attributeList,
  onConditionsChange,
  initialConditions = [],
  title = '',
  onTitleChange,
  onSave,
  onCancel,
  onDelete,
  showDelete = false,
  errorMessage = '',
  showError = false,
  isViewOnly = false,
}: ModalThemeSettingsPanelProps) => {
  // Track initial data for comparison
  const initialDataRef = useRef<{
    settings: ThemeTypesSetting;
    title: string;
    conditions: any[];
  } | null>(null);

  // Track current data
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentConditions, setCurrentConditions] = useState<any[]>(initialConditions);

  // Initialize initial data when component mounts or when initial data changes
  useEffect(() => {
    // Reset initial data when the modal opens with new data (title or conditions change)
    initialDataRef.current = {
      settings: { ...settings },
      title: title,
      conditions: [...initialConditions],
    };
  }, [title, initialConditions]); // Only reset when title or initialConditions change, not when settings change

  // Update current data when props change
  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  useEffect(() => {
    setCurrentConditions(initialConditions);
  }, [initialConditions]);

  // Check if data has changed
  const hasDataChanged = () => {
    if (!initialDataRef.current) return false;

    const initial = initialDataRef.current;
    return (
      !isEqual(settings, initial.settings) ||
      currentTitle !== initial.title ||
      !isEqual(currentConditions, initial.conditions)
    );
  };

  const handleTitleChange = (newTitle: string) => {
    setCurrentTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const handleConditionsChange = (newConditions: any[]) => {
    setCurrentConditions(newConditions);
    onConditionsChange?.(newConditions);
  };

  const isSaveDisabled = !hasDataChanged();

  return (
    <ScrollArea className="h-full border-r border-blue-100">
      <ThemeSettingsPanel
        settings={settings}
        defaultSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
        className="shadow-none h-full"
      >
        {/* Modal-specific content */}
        <div className="border-b border-blue-100">
          {/* Header with title input and delete button */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex-1 mr-4">
              <OutlineInput
                value={currentTitle}
                disabled={isViewOnly}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter variation title..."
                className="h-8 shadow-none focus-visible:ring-0 focus:border-b text-base"
              />
            </div>
            {showDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="flex-none hover:bg-destructive/20 hover:text-destructive"
                      variant="ghost"
                      size="icon"
                      onClick={onDelete}
                      disabled={isViewOnly}
                    >
                      <Delete2Icon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Delete condition variation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {/* Save/Cancel buttons */}
          <div className="flex justify-center gap-4 p-4 border-b border-gray-200 ">
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onSave && (
              <Button size="sm" onClick={onSave} disabled={isSaveDisabled}>
                Apply changes
              </Button>
            )}
          </div>

          {onConditionsChange && (
            <div className="p-4">
              <Rules
                onDataChange={handleConditionsChange}
                defaultConditions={initialConditions}
                isHorizontal={true}
                isShowIf={false}
                filterItems={['group', 'user-attr', 'current-page']}
                addButtonText={'Add condition'}
                attributes={attributeList || []}
                disabled={isViewOnly}
              />
            </div>
          )}
          {/* Error display */}
          {showError && errorMessage && (
            <div className="px-4 py-2 bg-red-50 ">
              <div className="text-red-600 text-sm">{errorMessage}</div>
            </div>
          )}
        </div>
        <ThemeSettingsAccordionContent />
      </ThemeSettingsPanel>
    </ScrollArea>
  );
};
