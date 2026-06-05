'use client';
import { SpinnerIcon } from '@usertour/icons';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
  Checkbox,
  Label,
} from '@usertour/ui';
import { useGetContentVersionQuery, usePublishContentVersionMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import * as React from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { getContentTypeMeta } from './content-type-meta';

interface ContentPublishFormProps {
  versionId: string;
  onSubmit: (success: boolean) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContentPublishForm = (props: ContentPublishFormProps) => {
  const { versionId, onSubmit, open, onOpenChange } = props;
  const { invoke: publishVersion } = usePublishContentVersionMutation();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { environmentList } = useEnvironmentList();
  const [selectedEnvironments, setSelectedEnvironments] = React.useState<string[]>([]);
  const { contentId } = useContentDetailUI();
  const { content, refetch } = useContentDetail(contentId);
  const contentTypeMeta = getContentTypeMeta(content?.type);

  // `skip: !open` so the dialog only pays for this query when it's
  // actually visible.
  const { version } = useGetContentVersionQuery(versionId, { skip: !open });

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
    const variant = isSuccess ? 'success' : 'destructive';
    const title = isSuccess
      ? t('contents.shared.publish.successToast', { type: contentTypeMeta.singular })
      : t('contents.shared.publish.failureToast', { type: contentTypeMeta.singular });
    toast({ variant, title: message || title });
  };

  const handleEnvironmentChange = (environmentId: string, checked: boolean) => {
    setSelectedEnvironments((prev) =>
      checked ? [...prev, environmentId] : prev.filter((id) => id !== environmentId),
    );
  };

  const getPublishButtonText = () => {
    const count = selectedEnvironments.length;
    if (count === 0) {
      return t('contents.shared.publish.button');
    }
    if (count === environmentList?.length) {
      return t('contents.shared.publish.buttonAll');
    }
    if (count === 1) {
      const name = environmentList?.find((env) => env.id === selectedEnvironments[0])?.name;
      return name
        ? t('contents.shared.publish.buttonToEnvironment', { name })
        : t('contents.shared.publish.button');
    }
    return t('contents.shared.publish.buttonToCount', { count });
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
        title: t('contents.shared.publish.noEnvironments'),
      });
      return;
    }

    if (selectedEnvironments.length === 0) {
      toast({
        variant: 'destructive',
        title: t('contents.shared.publish.selectEnvironment'),
      });
      return;
    }

    try {
      setIsLoading(true);
      const results = await Promise.all(
        selectedEnvironments.map((envId) => publishVersion(versionId, envId)),
      );

      const allSuccess = results.every(Boolean);
      const envNames = selectedEnvironments
        .map((id) => environmentList.find((env) => env.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      showToast(
        allSuccess,
        allSuccess
          ? t('contents.shared.publish.successToastEnvironments', {
              type: contentTypeMeta.singular,
              envNames,
            })
          : t('contents.shared.publish.partialFailure'),
      );

      await refetch();
      onSubmit(allSuccess);
      setIsLoading(false);
    } catch (error) {
      showToast(false, getErrorMessage(error));
      setIsLoading(false);
    }
  }, [environmentList, publishVersion, onSubmit, selectedEnvironments, toast, versionId, t]);

  if (!version) {
    return null;
  }

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {t('contents.shared.publish.title', { type: contentTypeMeta.singular })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('contents.shared.publish.environmentsLabel')}</Label>
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
                        {t('contents.shared.publish.alreadyOnVersion', {
                          name: env.name,
                          version: version.sequence + 1,
                        })}
                      </span>
                    ) : publishedVersion ? (
                      <span className="text-sm text-gray-500">
                        (v{publishedVersion.sequence + 1} → v{version.sequence + 1})
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {t('contents.shared.publish.unpublished')}
                      </span>
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
              {t('contents.shared.common.cancel')}
            </Button>
          </DialogClose>
          <Button
            className="flex-none"
            type="submit"
            disabled={isLoading || selectedEnvironments.length === 0 || allEnvironmentsUpToDate}
            onClick={handleOnSubmit}
          >
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            {getPublishButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
