import { Attribute, ThemeTypesSetting } from '@usertour-ui/types';
import { Button } from '@usertour-ui/button';
import { Input } from '@usertour-ui/input';
import { Delete2Icon } from '@usertour-ui/icons';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { Rules } from '@usertour-ui/shared-components';
import { ThemeSettingsPanel, ThemeSettingsAccordionContent } from './theme-settings-panel';

interface ModalThemeSettingsPanelProps {
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
}: ModalThemeSettingsPanelProps) => {
  return (
    <ScrollArea className="h-full">
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
              <Input
                value={title}
                onChange={(e) => onTitleChange?.(e.target.value)}
                placeholder="Enter variation title..."
                className="border-none shadow-none focus:ring-0 focus:ring-offset-0 px-0 py-0 text-lg font-medium"
              />
            </div>
            {showDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="p-1 h-auto">
                <Delete2Icon className="h-4 w-4 text-gray-500 hover:text-red-500" />
              </Button>
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
              <Button size="sm" onClick={onSave}>
                Save
              </Button>
            )}
          </div>

          {onConditionsChange && (
            <div className="p-4">
              <Rules
                onDataChange={onConditionsChange}
                defaultConditions={initialConditions}
                isHorizontal={true}
                isShowIf={false}
                filterItems={['group', 'user-attr', 'current-page']}
                addButtonText={'Add condition'}
                attributes={attributeList || []}
                disabled={false}
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
