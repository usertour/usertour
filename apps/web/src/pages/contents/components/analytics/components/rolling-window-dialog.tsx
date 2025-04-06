import { Dialog, DialogContent, DialogTrigger, DialogFooter } from '@usertour-ui/dialog';
import { Button } from '@usertour-ui/button';
import { Input } from '@usertour-ui/input';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import { SettingsIcon } from '@usertour-ui/icons';
import { useState } from 'react';

interface RollingWindowDialogProps {
  currentValue: number;
  onUpdate: (value: number) => Promise<void>;
}

export const RollingWindowDialog = ({ currentValue, onUpdate }: RollingWindowDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(currentValue);

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
          <span className="text-sm text-muted-foreground">{currentValue}-day rolling window</span>
          <SettingsIcon className="w-4 h-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <div className="py-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2 items-center">
                <label className="text-sm font-medium" htmlFor="rolling-window">
                  Rolling window size (days)
                </label>
                <QuestionTooltip>
                  The NPS is computed using a rolling window approach, meaning the score for each
                  day is derived from all responses collected within the preceding x days, where x
                  is the number you specify here
                </QuestionTooltip>
              </div>
              <Input
                type="number"
                value={tempValue}
                id="rolling-window"
                onChange={(e) => setTempValue(Number(e.target.value))}
                min="1"
                max="365"
                placeholder="Enter days (1-365)"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Update</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

RollingWindowDialog.displayName = 'RollingWindowDialog';
