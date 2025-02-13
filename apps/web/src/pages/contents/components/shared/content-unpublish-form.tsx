'use client';

import { Icons } from '@/components/atoms/icons';
import { useMutation } from '@apollo/client';
import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import { unpublishedContentVersion } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { Content } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import * as React from 'react';

interface ContentUnpublishFormProps {
  content: Content;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
}

export const ContentUnpublishForm = (props: ContentUnpublishFormProps) => {
  const { onSuccess, content, open, onOpenChange, name } = props;
  const [mutation] = useMutation(unpublishedContentVersion);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  async function handleOnSubmit() {
    setIsLoading(true);
    try {
      const variables = {
        contentId: content.id,
      };
      const ret = await mutation({ variables });
      if (ret.data?.unpublishedContentVersion?.success) {
        toast({
          variant: 'success',
          title: `The ${name} has been successfully created`,
        });
      }
      onSuccess();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unpublish {name}</DialogTitle>
          <DialogDescription>
            When you unpublish a {name}, users will no longer be able to view it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading} onClick={handleOnSubmit}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Unpublish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ContentUnpublishForm.displayName = 'ContentUnpublishForm';
