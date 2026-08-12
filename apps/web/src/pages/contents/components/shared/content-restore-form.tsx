'use client';
import { SpinnerIcon } from '@usertour/icons';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@usertour/ui';
import { useRestoreContentVersionMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { ContentVersion } from '@usertour/types';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

interface ContentRestoreFormProps {
  version: ContentVersion;
  onSubmit: (success: boolean) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContentRestoreForm = (props: ContentRestoreFormProps) => {
  const { version, onSubmit, open, onOpenChange } = props;
  const { invoke: restoreVersion } = useRestoreContentVersionMutation();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  async function handleOnSubmit() {
    try {
      setIsLoading(true);
      const success = await restoreVersion(version.id);
      setIsLoading(false);
      if (success) {
        toast({
          variant: 'success',
          title: t('contents.shared.restore.successToast'),
        });
        onSubmit(true);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      onSubmit(false);
      setIsLoading(false);
    }
  }

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('contents.shared.restore.title')}</DialogTitle>
        </DialogHeader>
        <div>
          {/* Display version numbers are 1-based everywhere else (v{sequence + 1}
              in version-row / publish / unpublish) — keep this dialog consistent. */}
          <p>{t('contents.shared.restore.descriptionLoad', { version: version.sequence + 1 })}</p>
          <p>
            {t('contents.shared.restore.descriptionConfirm', { version: version.sequence + 1 })}
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              {t('contents.shared.common.cancel')}
            </Button>
          </DialogClose>
          <Button className="flex-none" type="submit" disabled={isLoading} onClick={handleOnSubmit}>
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            {t('contents.shared.restore.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
