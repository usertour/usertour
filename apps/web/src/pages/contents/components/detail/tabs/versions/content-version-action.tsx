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
import { useTranslation } from 'react-i18next';
import { ContentPublishForm } from '../../../shared/content-publish-form';
import { ContentRestoreForm } from '../../../shared/content-restore-form';
import { useAppContext } from '@/contexts/app-context';
import { useVersionActionState } from './use-version-action-state';

type ContentVersionActionProps = {
  version: ContentVersion;
};
export const ContentVersionAction = (props: ContentVersionActionProps) => {
  const { version } = props;
  const { t } = useTranslation();
  // No `refetch` destructure: the publish / restore mutations declare
  // `refetchQueries: ['getContent', ...]`, so Apollo refreshes the
  // owning content on success without each per-row component holding
  // its own callback. Same reason `useContentVersionList` is gone —
  // `useRestoreContentVersionMutation` already lists
  // `listContentVersions` in its refetchQueries.
  const { isViewOnly } = useAppContext();

  const [openPublish, setOpenPublish] = useState(false);
  const [openRetore, setOpenRestore] = useState(false);
  const { publishDisabled, restoreDisabled } = useVersionActionState(version.id);

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
            disabled={publishDisabled}
            onClick={() => {
              setOpenPublish(true);
            }}
          >
            <PlaneIcon className="w-6" width={16} height={16} />
            {t('contents.versions.action.publish')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={restoreDisabled}
            onClick={() => {
              setOpenRestore(true);
            }}
          >
            <ResetIcon className="w-6" width={16} height={16} />
            {t('contents.versions.action.restore')}
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
