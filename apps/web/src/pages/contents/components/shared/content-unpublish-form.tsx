'use client';

import { Icons } from '@/components/atoms/icons';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
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
import { Checkbox } from '@usertour-ui/checkbox';
import { Label } from '@usertour-ui/label';

interface ContentUnpublishFormProps {
  content: Content;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
}

export const ContentUnpublishForm = (props: ContentUnpublishFormProps) => {
  const { onSuccess, content, open, onOpenChange } = props;
  const [mutation] = useMutation(unpublishedContentVersion);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { environmentList } = useEnvironmentListContext();
  const [selectedEnvironments, setSelectedEnvironments] = React.useState<string[]>([]);

  // Reset selected environments when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedEnvironments([]);
    }
  }, [open]);

  const getPublishedEnvironments = () => {
    if (!environmentList) return [];

    // If we have contentOnEnvironments, use it to determine published state
    if (content?.contentOnEnvironments && content.contentOnEnvironments.length > 0) {
      return environmentList.map((env) => {
        const envContent = content.contentOnEnvironments?.find(
          (envContent) => envContent.environment.id === env.id,
        );
        return {
          environmentId: env.id,
          environment: env,
          published: envContent?.published || false,
          publishedVersion: envContent?.publishedVersion || null,
        };
      });
    }

    // If we have a single published environment
    if (content?.published) {
      return environmentList.map((env) => ({
        environmentId: env.id,
        environment: env,
        published: env.id === content.environmentId,
        publishedVersion: content.publishedVersion,
      }));
    }

    // If no published content, all environments are unpublished
    return environmentList.map((env) => ({
      environmentId: env.id,
      environment: env,
      published: false,
      publishedVersion: null,
    }));
  };

  const handleEnvironmentChange = (environmentId: string, checked: boolean) => {
    setSelectedEnvironments((prev) =>
      checked ? [...prev, environmentId] : prev.filter((id) => id !== environmentId),
    );
  };

  const getUnpublishButtonText = () => {
    if (selectedEnvironments.length === 0) {
      return 'Unpublish';
    }

    if (selectedEnvironments.length === getPublishedEnvironments().length) {
      return 'Unpublish from all environments';
    }

    const selectedEnvNames = selectedEnvironments
      .map((id) => environmentList?.find((env) => env.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    return `Unpublish from ${selectedEnvNames}`;
  };

  async function handleOnSubmit() {
    if (selectedEnvironments.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Please select at least one environment to unpublish from.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const results = await Promise.all(
        selectedEnvironments.map((envId) =>
          mutation({
            variables: {
              contentId: content.id,
              environmentId: envId,
            },
          }),
        ),
      );

      const allSuccess = results.every((result) => result.data?.unpublishedContentVersion?.success);
      const envNames = selectedEnvironments
        .map((id) => environmentList?.find((env) => env.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      toast({
        variant: allSuccess ? 'default' : 'destructive',
        title: allSuccess
          ? `The ${content?.type} has been successfully unpublished from ${envNames}`
          : 'Some environments failed to unpublish',
      });

      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
    setIsLoading(false);
  }

  const publishedEnvironments = getPublishedEnvironments();

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Unpublish {content?.type}</DialogTitle>
          <DialogDescription>
            When you unpublish a {content?.type}, users will no longer be able to view it. <br />
            Select the environments you want to unpublish the {content?.type} from.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {publishedEnvironments.map((env) => {
            const envId = env.environmentId;
            const envName = env.environment.name;
            const version = env.publishedVersion;
            const isPublished = env.published;
            const isSelected = selectedEnvironments.includes(envId);

            return (
              <div key={envId} className="flex items-center space-x-2">
                <Checkbox
                  id={`env-${envId}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleEnvironmentChange(envId, checked as boolean)}
                  disabled={!isPublished}
                />
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`env-${envId}`}>{envName}</Label>
                  {isPublished ? (
                    version && (
                      <>
                        <span className="text-sm text-gray-500">(v{version.sequence})</span>
                        {isSelected && (
                          <span className="text-sm text-destructive">To be unpublished</span>
                        )}
                      </>
                    )
                  ) : (
                    <span className="text-sm text-gray-500">(Not published)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            variant={'destructive'}
            disabled={isLoading || selectedEnvironments.length === 0}
            onClick={handleOnSubmit}
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {getUnpublishButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ContentUnpublishForm.displayName = 'ContentUnpublishForm';
