import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogFooter,
  Button,
  Input,
  QuestionTooltip,
} from '@usertour/ui';
import { SettingsIcon } from '@usertour/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RollingWindowDialogProps {
  currentValue: number;
  onUpdate: (value: number) => Promise<void>;
}

export const RollingWindowDialog = ({ currentValue, onUpdate }: RollingWindowDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(currentValue);
  const { t } = useTranslation();

  const handleConfirm = async () => {
    await onUpdate(tempValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempValue(currentValue);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button type="button" className="flex flex-row items-center gap-1 cursor-pointer">
          <span className="text-sm text-muted-foreground">
            {t('contents.analytics.rollingWindow.label', { count: currentValue })}
          </span>
          <SettingsIcon className="w-4 h-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <div className="py-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2 items-center">
                <label className="text-sm font-medium" htmlFor="rolling-window">
                  {t('contents.analytics.rollingWindow.sizeLabel')}
                </label>
                <QuestionTooltip>
                  {t('contents.analytics.rollingWindow.sizeTooltip')}
                </QuestionTooltip>
              </div>
              <Input
                type="number"
                value={tempValue}
                id="rolling-window"
                onChange={(e) => setTempValue(Number(e.target.value))}
                min="1"
                max="365"
                placeholder={t('contents.analytics.rollingWindow.placeholder')}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              {t('contents.analytics.rollingWindow.cancel')}
            </Button>
            <Button onClick={handleConfirm}>{t('contents.analytics.rollingWindow.update')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

RollingWindowDialog.displayName = 'RollingWindowDialog';
