'use client';
import { Icons } from '@/components/atoms/icons';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
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
import { useCallback } from 'react';
import { Checkbox } from '@usertour-ui/checkbox';
import { Label } from '@usertour-ui/label';
import { useContentDetailContext } from '@/contexts/content-detail-context';

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
  const { environmentList } = useEnvironmentListContext();
  const [selectedEnvironments, setSelectedEnvironments] = React.useState<string[]>([]);
  const [version, setVersion] = React.useState<ContentVersion>();
  const { content, refetch } = useContentDetailContext();

  const contentVersion = useQuery(getContentVersion, {
    variables: { versionId },
  });

  React.useEffect(() => {
    if (contentVersion?.data?.getContentVersion) {
      setVersion(contentVersion.data.getContentVersion);
    }
  }, [contentVersion?.data]);

  React.useEffect(() => {
    if (open) {
      setSelectedEnvironments([]);
    }
  }, [open]);

  const getPublishedVersionInfo = React.useCallback(
    (envId: string) => {
      if (content?.contentOnEnvironments && content?.contentOnEnvironments.length > 0) {
        const envContent = content?.contentOnEnvironments?.find(
          (env) => env.environment.id === envId,
        );
        if (envContent?.published) {
          return envContent?.publishedVersion;
        }
      } else {
        if (content?.published && content?.publishedVersion && content.environmentId === envId) {
          return content?.publishedVersion;
        }
      }

      return null;
    },
    [
      content?.contentOnEnvironments,
      content?.published,
      content?.publishedVersion,
      content?.environmentId,
    ],
  );

  const showToast = (isSuccess: boolean, message?: string) => {
    const variant = isSuccess ? 'default' : 'destructive';
    const title = isSuccess ? 'The flow published successfully.' : 'The flow published failed.';
    toast({ variant, title: message || title });
  };

  const handleEnvironmentChange = (environmentId: string, checked: boolean) => {
    setSelectedEnvironments((prev) =>
      checked ? [...prev, environmentId] : prev.filter((id) => id !== environmentId),
    );
  };

  const getPublishButtonText = () => {
    if (selectedEnvironments.length === 0) {
      return 'Publish';
    }

    if (selectedEnvironments.length === environmentList?.length) {
      return 'Publish to all environments';
    }

    const selectedEnvNames = selectedEnvironments
      .map((id) => environmentList?.find((env) => env.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    return `Publish to ${selectedEnvNames}`;
  };

  const allEnvironmentsUpToDate = React.useMemo(() => {
    if (!environmentList) return false;
    return environmentList.every((env) => {
      const publishedVersion = getPublishedVersionInfo(env.id);
      return publishedVersion?.id === version?.id;
    });
  }, [environmentList, version?.id, content?.contentOnEnvironments, content?.publishedVersion]);

  const handleOnSubmit = useCallback(async () => {
    if (!environmentList) {
      toast({
        variant: 'destructive',
        title: 'No environments available.',
      });
      return;
    }

    if (selectedEnvironments.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Please select at least one environment to publish to.',
      });
      return;
    }

    try {
      setIsLoading(true);
      const results = await Promise.all(
        selectedEnvironments.map((envId) =>
          mutation({
            variables: { versionId: versionId, environmentId: envId },
          }),
        ),
      );

      const allSuccess = results.every((result) => !!result.data?.publishedContentVersion?.id);
      const envNames = selectedEnvironments
        .map((id) => environmentList.find((env) => env.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      showToast(
        allSuccess,
        allSuccess
          ? `The ${content?.type} published successfully to ${envNames}.`
          : 'Some environments failed to publish.',
      );

      await refetch();
      onSubmit(allSuccess);
      setIsLoading(false);
    } catch (error) {
      showToast(false, getErrorMessage(error));
      setIsLoading(false);
    }
  }, [environmentList, mutation, onSubmit, selectedEnvironments, toast, versionId]);

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Publish {content?.type}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Environments to publish to :</Label>
            {environmentList?.map((env) => {
              const publishedVersion = getPublishedVersionInfo(env.id);
              const isAlreadyPublished = publishedVersion?.id === version?.id;
              return (
                <div key={env.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`env-${env.id}`}
                    checked={selectedEnvironments.includes(env.id)}
                    onCheckedChange={(checked) =>
                      handleEnvironmentChange(env.id, checked as boolean)
                    }
                    disabled={isAlreadyPublished}
                  />
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`env-${env.id}`}>{env.name}</Label>
                    {isAlreadyPublished ? (
                      <span className="text-sm text-gray-500">
                        ({env.name} is already on v{version?.sequence})
                      </span>
                    ) : publishedVersion ? (
                      <span className="text-sm text-gray-500">
                        (v{publishedVersion.sequence} → v{version?.sequence})
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Unpublished</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button
            className="flex-none"
            type="submit"
            disabled={isLoading || selectedEnvironments.length === 0 || allEnvironmentsUpToDate}
            onClick={handleOnSubmit}
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {getPublishButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
