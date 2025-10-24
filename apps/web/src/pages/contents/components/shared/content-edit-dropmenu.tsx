import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { CopyIcon, Delete2Icon, UnPublishIcon } from '@usertour-packages/icons';
import { Content } from '@usertour/types';
import { ReactNode, useState } from 'react';
import { ContentDeleteForm } from './content-delete-form';
import { ContentDuplicateForm } from './content-duplicate-form';
import { ContentUnpublishForm } from './content-unpublish-form';
import { isPublishedAtLeastOneEnvironment } from '@usertour/helpers';

type ContentEditDropdownMenuProps = {
  content: Content;
  children: ReactNode;
  onSubmit: (action: string) => void;
  disabled: boolean;
};
export const ContentEditDropdownMenu = (props: ContentEditDropdownMenuProps) => {
  const { content, children, onSubmit, disabled } = props;
  const [openDelete, setOpenDelete] = useState(false);
  const [openDuplicate, setOpenDuplicate] = useState(false);
  const [openUnpublish, setOpenUnpublish] = useState(false);

  const isPublished = isPublishedAtLeastOneEnvironment(content);

  const handleOnClick = () => {
    setOpenDelete(true);
  };

  const handleDuplicateOpen = () => {
    setOpenDuplicate(true);
  };
  const handleUnpublishOpen = () => {
    setOpenUnpublish(true);
  };
  const handleDuplicateSuccess = () => {
    setOpenDuplicate(false);
    onSubmit('duplicate');
  };
  const handleUnpublishSuccess = () => {
    setOpenUnpublish(false);
    onSubmit('unpublish');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
          <DropdownMenuItem
            onClick={handleUnpublishOpen}
            className="cursor-pointer"
            disabled={!isPublished || disabled}
          >
            <UnPublishIcon className="mr-1" width={14} height={14} />
            Unpublish
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDuplicateOpen}
            className="cursor-pointer"
            disabled={disabled}
          >
            <CopyIcon className="mr-1" width={15} height={15} />
            Duplicate {content.type}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 cursor-pointer"
            onClick={handleOnClick}
            disabled={isPublishedAtLeastOneEnvironment(content) || disabled}
          >
            <Delete2Icon className="mr-1" />
            Delete {content.type}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContentDuplicateForm
        content={content}
        open={openDuplicate}
        onOpenChange={setOpenDuplicate}
        onSuccess={handleDuplicateSuccess}
        name={content.type}
      />
      <ContentDeleteForm
        name="flow"
        content={content}
        open={openDelete}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          onSubmit('delete');
        }}
      />
      <ContentUnpublishForm
        name="flow"
        content={content}
        open={openUnpublish}
        onOpenChange={setOpenUnpublish}
        onSuccess={handleUnpublishSuccess}
      />
    </>
  );
};

ContentEditDropdownMenu.displayName = 'ContentEditDropdownMenu';
