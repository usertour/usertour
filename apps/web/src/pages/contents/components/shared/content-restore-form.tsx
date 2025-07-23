'use client';
import { Icons } from '@/components/atoms/icons';
import { useMutation } from '@apollo/client';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import { restoreContentVersion } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour-packages/utils';
import { ContentVersion } from '@usertour-packages/types';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';

interface ContentRestoreFormProps {
  version: ContentVersion;
  onSubmit: (success: boolean) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContentRestoreForm = (props: ContentRestoreFormProps) => {
  const { version, onSubmit, open, onOpenChange } = props;
  const [mutation] = useMutation(restoreContentVersion);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  async function handleOnSubmit() {
    try {
      setIsLoading(true);
      const { data } = await mutation({
        variables: { versionId: version.id },
      });
      setIsLoading(false);
      if (data.restoreContentVersion.id) {
        toast({
          variant: 'success',
          title: 'The version retored successfully.',
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore version </DialogTitle>
        </DialogHeader>
        <div>
          <p>This will load all of the original flow of v{version.sequence} into the Builder.</p>
          <p>Restore Builder to v{version.sequence}?</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button className="flex-none" type="submit" disabled={isLoading} onClick={handleOnSubmit}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Yes, restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
