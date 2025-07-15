import { Button } from '@usertour-ui/button';
import { Dialog, DialogContentSimple2, DialogTitle, DialogTrigger } from '@usertour-ui/dialog';
import { PlusIcon } from '@radix-ui/react-icons';
import {
  ThemeTypesSetting,
  ThemeDetailSelectorType,
  ThemeDetailPreviewType,
  Theme,
} from '@usertour-ui/types';
import { defaultSettings } from '@usertour-ui/types';
import { useState } from 'react';
import { ThemeSettingsPanel } from './theme-settings-panel';
import { ThemePreviewPanel } from './theme-preview-panel';
import { Rect } from './theme-editor';

export const SubThemeModal = () => {
  const [open, setOpen] = useState(false);
  const [subThemeSettings, setSubThemeSettings] = useState<ThemeTypesSetting>(defaultSettings);
  const [selectedType, setSelectedType] = useState<ThemeDetailSelectorType>({
    name: 'Tooltip',
    type: ThemeDetailPreviewType.TOOLTIP,
  });
  const [customStyle, setCustomStyle] = useState<string>('');
  const [viewRect, setViewRect] = useState<Rect | undefined>();

  // Create a mock theme for preview
  const mockTheme: Theme = {
    id: 'mock-theme',
    name: 'Mock Theme',
    settings: defaultSettings,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: false,
    isSystem: false,
    projectId: 'mock-project',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Add Sub Theme
        </Button>
      </DialogTrigger>
      <DialogTitle className="sr-only">Create Sub Theme</DialogTitle>
      <DialogContentSimple2 className="flex flex-row max-w-[80vw] max-h-[90vh] w-full h-full overflow-hidden p-0 gap-0">
        <ThemeSettingsPanel
          settings={subThemeSettings}
          defaultSettings={defaultSettings}
          onSettingsChange={setSubThemeSettings}
          enableScroll={true}
          className="shadow-none"
        />
        <ThemePreviewPanel
          settings={subThemeSettings}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          onCustomStyleChange={setCustomStyle}
          onViewRectChange={setViewRect}
          showSelector={true}
          customStyle={customStyle}
          viewRect={viewRect}
          theme={mockTheme}
          className="h-full ml-0 shadow-none"
        />
      </DialogContentSimple2>
    </Dialog>
  );
};

SubThemeModal.displayName = 'SubThemeModal';
