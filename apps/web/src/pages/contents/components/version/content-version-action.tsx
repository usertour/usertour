import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { DotsHorizontalIcon, ResetIcon } from '@radix-ui/react-icons';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour/ui';
import { PlaneIcon } from '@usertour/icons';
import { ContentVersion } from '@usertour/types';
import { useState } from 'react';
import { ContentPublishForm } from '../shared/content-publish-form';
import { ContentRestoreForm } from '../shared/content-restore-form';
import { useAppContext } from '@/contexts/app-context';
import { isPublishedInAllEnvironments } from '@/utils/content';
import { useEnvironmentList } from '@/hooks/use-environment-list';

type ContentVersionActionProps = {
  version: ContentVersion;
};
export const ContentVersionAction = (props: ContentVersionActionProps) => {
  const { version } = props;
  const { contentId } = useContentDetailUI();
  // No `refetch` destructure: the publish / restore mutations declare
  // `refetchQueries: ['getContent', ...]`, so Apollo refreshes the
  // owning content on success without each per-row component holding
  // its own callback. Same reason `useContentVersionList` is gone —
  // `useRestoreContentVersionMutation` already lists
  // `listContentVersions` in its refetchQueries.
  const { content } = useContentDetail(contentId);
  const { isViewOnly } = useAppContext();

  const [openPublish, setOpenPublish] = useState(false);
  const [openRetore, setOpenRestore] = useState(false);
  const { environmentList } = useEnvironmentList();

  const isDisabledPublish = isPublishedInAllEnvironments(content, environmentList, version);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            disabled={isViewOnly}
          >
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[100px]">
          <DropdownMenuItem
            disabled={isDisabledPublish}
            onClick={() => {
              setOpenPublish(true);
            }}
            className="cursor-pointer"
          >
            <PlaneIcon className="w-6" width={16} height={16} />
            Publish...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={content?.editedVersionId === version.id}
            onClick={() => {
              setOpenRestore(true);
            }}
            className="cursor-pointer"
          >
            <ResetIcon className="w-6" width={16} height={16} />
            Restore...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContentPublishForm
        versionId={version.id}
        open={openPublish}
        onOpenChange={setOpenPublish}
        onSubmit={() => {
          setOpenPublish(false);
        }}
      />
      <ContentRestoreForm
        version={version}
        open={openRetore}
        onOpenChange={setOpenRestore}
        onSubmit={() => {
          setOpenRestore(false);
        }}
      />
    </>
  );
};

ContentVersionAction.displayName = ' ContentVersionAction';
