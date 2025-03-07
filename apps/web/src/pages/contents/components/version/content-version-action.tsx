import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionListContext } from '@/contexts/content-version-list-context';
import { DotsHorizontalIcon, ResetIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { PlaneIcon } from '@usertour-ui/icons';
import { ContentVersion } from '@usertour-ui/types';
import { useState } from 'react';
import { ContentPublishForm } from '../shared/content-publish-form';
import { ContentRestoreForm } from '../shared/content-restore-form';
import { useAppContext } from '@/contexts/app-context';
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
            disabled={content?.publishedVersionId === version.id}
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
          refetch();
        }}
      />
      <ContentRestoreForm
        version={version}
        open={openRetore}
        onOpenChange={setOpenRestore}
        onSubmit={() => {
          setOpenRestore(false);
          refetch();
          refetchVersionList();
        }}
      />
    </>
  );
};

ContentVersionAction.displayName = ' ContentVersionAction';
