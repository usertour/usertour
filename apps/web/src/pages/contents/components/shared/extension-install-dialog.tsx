'use client';

import { DialogClose } from '@radix-ui/react-dialog';
import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import { CheckedIcon, IndeterminateCircleIcon, WarningCircleIcon } from '@usertour-ui/icons';
import { useDetectExtension } from '@usertour-ui/shared-hooks';
import { useEffect } from 'react';

interface ExtensionInstallFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInstalled: () => void;
}

export const ExtensionInstallDialog = (props: ExtensionInstallFormProps) => {
  const { onOpenChange, isOpen, onInstalled } = props;
  const { isInstalled, isTimeout, start, stop } = useDetectExtension();
  useEffect(() => {
    if (isOpen) {
      start();
    } else {
      stop();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isInstalled) {
      onInstalled();
    }
  }, [isInstalled]);

  return (
    <Dialog open={isOpen} defaultOpen={false} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl	">
        <DialogHeader>
          <DialogTitle>Install the Usertour Builder</DialogTitle>
          <DialogDescription>Get the Chrome extension to continue.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-row bg-muted/50 p-4 rounded-lg space-x-2">
          <img src="/images/install-6.png" className="h-24" />
          <div className="flex flex-col p-2 space-y-2">
            <div className="flex flex-row items-center justify-between">
              <span>The Usertour Builder</span>
              {!isInstalled && (
                <span className="bg-accent rounded px-2 py-1 text-sm font-bold flex flex-row items-center space-x-1 text-foreground/80 ">
                  <IndeterminateCircleIcon width={16} height={16} />
                  <span className="text-xs">Not installed</span>
                </span>
              )}
              {isInstalled && <CheckedIcon className="text-success" width={20} height={20} />}
            </div>
            <div className="text-sm text-muted-foreground">
              The Usertour Builder Chrome extension lets you create and edit in-app experiences for
              websites.
            </div>
          </div>
        </div>
        {isTimeout && (
          <div className="text-destructive text-xs flex flex-row items-center space-x-1">
            <WarningCircleIcon width={16} height={16} />
            <span>Chrome extension not found, please try installing again.</span>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={() => {
              window.open(
                'https://chromewebstore.google.com/detail/usertour/piokfnnpdpamccflfnecelimghgdmhei',
                '_blank',
              );
            }}
          >
            Install Chrome extension
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ExtensionInstallDialog.displayName = 'ExtensionInstallDialog';
