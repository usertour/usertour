import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionListContext } from '@/contexts/content-version-list-context';
import { DotsHorizontalIcon, ResetIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { PlaneIcon } from '@usertour-packages/icons';
import { ContentVersion } from '@usertour/types';
import { useState } from 'react';
import { ContentPublishForm } from '../shared/content-publish-form';
import { ContentRestoreForm } from '../shared/content-restore-form';
import { useAppContext } from '@/contexts/app-context';
import { isPublishedInAllEnvironments } from '@/utils/content';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';

type ContentVersionActionProps = {
  version: ContentVersion;
};
export const ContentVersionAction = (props: ContentVersionActionProps) => {
  const { version } = props;
  const { refetch, content } = useContentDetailContext();
  const { isViewOnly } = useAppContext();

  const { refetch: refetchVersionList } = useContentVersionListContext();
  const [openPublish, setOpenPublish] = useState(false);
  const [openRetore, setOpenRestore] = useState(false);
  const { environmentList } = useEnvironmentListContext();

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
        onSubmit={async () => {
          await refetch();
          await refetchVersionList();
          setOpenPublish(false);
        }}
      />
      <ContentRestoreForm
        version={version}
        open={openRetore}
        onOpenChange={setOpenRestore}
        onSubmit={async () => {
          await refetch();
          await refetchVersionList();
          setOpenRestore(false);
        }}
      />
    </>
  );
};

ContentVersionAction.displayName = ' ContentVersionAction';
