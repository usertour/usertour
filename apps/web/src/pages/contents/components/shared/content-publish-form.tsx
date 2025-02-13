'use client';
import { Icons } from '@/components/atoms/icons';
import { useMutation, useQuery } from '@apollo/client';
import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import { getContentVersion, publishedContentVersion } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { ContentVersion } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import * as React from 'react';

interface ContentPublishFormProps {
  versionId: string;
  onSubmit: (success: boolean) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContentPublishForm = (props: ContentPublishFormProps) => {
  const { versionId, onSubmit, open, onOpenChange } = props;
  const [mutation] = useMutation(publishedContentVersion);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const [version, setVersion] = React.useState<ContentVersion>();

  const contentVersion = useQuery(getContentVersion, {
    variables: { versionId: versionId },
  });

  React.useEffect(() => {
    if (contentVersion?.data?.getContentVersion) {
      setVersion(contentVersion.data.getContentVersion);
    }
  }, [contentVersion?.data]);

  const showToast = (isSuccess: boolean, message?: string) => {
    const variant = isSuccess ? 'success' : 'destructive';
    const title = isSuccess ? 'The flow published successfully.' : 'The flow published failed.';
    toast({ variant, title: message || title });
  };

  async function handleOnSubmit() {
    try {
      setIsLoading(true);
      const { data } = await mutation({
        variables: { versionId: versionId },
      });
      const isSuccess = !!data.publishedContentVersion.id;
      showToast(isSuccess);
      onSubmit(isSuccess);
      setIsLoading(false);
    } catch (error) {
      showToast(false, getErrorMessage(error));
      setIsLoading(false);
    }
  }

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish flow </DialogTitle>
        </DialogHeader>
        <div>
          The version you are about to publish is{' '}
          <span className="font-bold">v{version?.sequence}</span>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button className="flex-none" type="submit" disabled={isLoading} onClick={handleOnSubmit}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
