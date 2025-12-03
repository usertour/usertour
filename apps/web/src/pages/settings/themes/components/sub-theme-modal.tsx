import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogContentSimple2,
  DialogTitle,
  DialogTrigger,
} from '@usertour-packages/dialog';
import { PlusIcon } from '@radix-ui/react-icons';
import {
  ThemeTypesSetting,
  ThemeDetailSelectorType,
  ThemeDetailPreviewType,
  ThemeVariation,
  Attribute,
} from '@usertour/types';
import { defaultSettings } from '@usertour/types';
import { useState, useEffect } from 'react';
import { cuid } from '@usertour/helpers';
import { ModalThemeSettingsPanel } from './modal-theme-settings-panel';
import { ThemePreviewPanel } from './theme-preview-panel';

interface SubThemeModalProps {
  isViewOnly?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialVariation?: ThemeVariation | null;
  onSave?: (variation: ThemeVariation) => void;
  onDelete?: () => void;
  attributeList?: Attribute[];
  onConditionsChange?: (conditions: any[]) => void;
}

export const SubThemeModal = ({
  isViewOnly = false,
  isOpen,
  onOpenChange,
  initialVariation,
  onSave,
  onDelete,
  attributeList,
  onConditionsChange,
}: SubThemeModalProps) => {
  const [open, setOpen] = useState(false);
  const [subThemeSettings, setSubThemeSettings] = useState<ThemeTypesSetting>(defaultSettings);
  const [conditions, setConditions] = useState<any[]>([]);
  const [title, setTitle] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ThemeDetailSelectorType>({
    name: 'Tooltip',
    type: ThemeDetailPreviewType.TOOLTIP,
  });
  const [customStyle, setCustomStyle] = useState<string>('');
  const [showError, setShowError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');

  // Initialize with initial variation data if provided
  useEffect(() => {
    if (initialVariation) {
      // For existing variations, use the variation's settings
      setSubThemeSettings(initialVariation.settings);
      setConditions(initialVariation.conditions);
      setTitle(initialVariation.name || '');
    } else {
      // For new variations, use default settings
      setSubThemeSettings(defaultSettings);
      setConditions([]);
      setTitle('');
    }
    setShowError(false);
    setErrorInfo('');
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

  const validateForm = () => {
    if (!title.trim()) {
      setErrorInfo('Please enter a title for this variation');
      setShowError(true);
      return false;
    }

    if (!conditions || conditions.length === 0) {
      setErrorInfo('Please add at least one condition');
      setShowError(true);
      return false;
    }

    setShowError(false);
    setErrorInfo('');
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    if (onSave) {
      const variation: ThemeVariation = {
        id: initialVariation?.id || cuid(), // Use existing ID or generate new one
        name: title.trim(),
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

  const handleDelete = () => {
    // Call the onDelete callback if provided
    if (onDelete) {
      onDelete();
    } else {
      // Fallback: just close the modal
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isOpen && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={isViewOnly}>
            <PlusIcon className="h-4 w-4" />
            Add Sub Theme
          </Button>
        </DialogTrigger>
      )}
      <DialogTitle className="sr-only">
        {initialVariation ? 'Edit Conditional Variation' : 'Create Conditional Variation'}
      </DialogTitle>
      <DialogContentSimple2 className="flex flex-row max-w-[80vw] max-h-[90vh] w-full h-full overflow-hidden p-0 gap-0">
        <ModalThemeSettingsPanel
          settings={subThemeSettings}
          defaultSettings={defaultSettings}
          onSettingsChange={setSubThemeSettings}
          attributeList={attributeList}
          onConditionsChange={handleConditionsChange}
          initialConditions={conditions}
          title={title}
          onTitleChange={setTitle}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={handleDelete}
          showDelete={!!initialVariation}
          errorMessage={errorInfo}
          showError={showError}
          isViewOnly={isViewOnly}
        />

        <ThemePreviewPanel
          settings={subThemeSettings}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          onCustomStyleChange={setCustomStyle}
          showSelector={true}
          customStyle={customStyle}
          className="h-full ml-0 shadow-none"
        />
      </DialogContentSimple2>
    </Dialog>
  );
};

SubThemeModal.displayName = 'SubThemeModal';
