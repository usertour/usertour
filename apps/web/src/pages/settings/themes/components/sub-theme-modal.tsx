import { Button } from '@usertour-ui/button';
import { Dialog, DialogContentSimple2, DialogTitle, DialogTrigger } from '@usertour-ui/dialog';
import { PlusIcon } from '@radix-ui/react-icons';
import {
  ThemeTypesSetting,
  ThemeDetailSelectorType,
  ThemeDetailPreviewType,
  ThemeVariation,
  Attribute,
} from '@usertour-ui/types';
import { defaultSettings } from '@usertour-ui/types';
import { useState, useEffect } from 'react';
import { ThemeSettingsPanel } from './theme-settings-panel';
import { ThemePreviewPanel } from './theme-preview-panel';
import { Rect } from './theme-editor';

interface SubThemeModalProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialVariation?: ThemeVariation | null;
  onSave?: (variation: ThemeVariation) => void;
  attributeList?: Attribute[];
  onConditionsChange?: (conditions: any[]) => void;
}

export const SubThemeModal = ({
  isOpen,
  onOpenChange,
  initialVariation,
  onSave,
  attributeList,
  onConditionsChange,
}: SubThemeModalProps) => {
  const [open, setOpen] = useState(false);
  const [subThemeSettings, setSubThemeSettings] = useState<ThemeTypesSetting>(defaultSettings);
  const [conditions, setConditions] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<ThemeDetailSelectorType>({
    name: 'Tooltip',
    type: ThemeDetailPreviewType.TOOLTIP,
  });
  const [customStyle, setCustomStyle] = useState<string>('');
  const [viewRect, setViewRect] = useState<Rect | undefined>();

  // Initialize with initial variation data if provided
  useEffect(() => {
    if (initialVariation) {
      // For existing variations, use the variation's settings
      setSubThemeSettings(initialVariation.settings);
      setConditions(initialVariation.conditions);
    } else {
      // For new variations, use default settings
      setSubThemeSettings(defaultSettings);
      setConditions([]);
    }
  }, [initialVariation]);

  // Sync with external open state
  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen);
    }
  }, [isOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  const handleConditionsChange = (newConditions: any[]) => {
    setConditions(newConditions);
    if (onConditionsChange) {
      onConditionsChange(newConditions);
    }
  };

  const handleSave = () => {
    if (onSave) {
      const variation: ThemeVariation = {
        conditions,
        settings: subThemeSettings,
      };
      onSave(variation);
      handleOpenChange(false);
    }
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isOpen && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Sub Theme
          </Button>
        </DialogTrigger>
      )}
      <DialogTitle className="sr-only">
        {initialVariation ? 'Edit Conditional Variation' : 'Create Conditional Variation'}
      </DialogTitle>
      <DialogContentSimple2 className="flex flex-row max-w-[80vw] max-h-[90vh] w-full h-full overflow-hidden p-0 gap-0">
        <ThemeSettingsPanel
          settings={subThemeSettings}
          defaultSettings={defaultSettings}
          onSettingsChange={setSubThemeSettings}
          isInModal={true}
          className="shadow-none"
          attributeList={attributeList}
          onSave={handleSave}
          onCancel={handleCancel}
          onConditionsChange={handleConditionsChange}
          initialConditions={conditions}
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
          className="h-full ml-0 shadow-none"
        />
      </DialogContentSimple2>
    </Dialog>
  );
};

SubThemeModal.displayName = 'SubThemeModal';
