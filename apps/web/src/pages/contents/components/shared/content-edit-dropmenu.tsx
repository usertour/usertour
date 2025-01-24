import { ReactNode, useState } from "react";
import { Content } from "@usertour-ui/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@usertour-ui/dropdown-menu";
import { CopyIcon, Delete2Icon, UnPublishIcon } from "@usertour-ui/icons";
import { ContentDuplicateForm } from "./content-duplicate-form";
import { ContentDeleteForm } from "./content-delete-form";
import { ContentUnpublishForm } from "./content-unpublish-form";

type ContentEditDropdownMenuProps = {
  content: Content;
  children: ReactNode;
  onSubmit: (action: string) => void;
};
export const ContentEditDropdownMenu = (
  props: ContentEditDropdownMenuProps
) => {
  const { content, children, onSubmit } = props;
  const [openDelete, setOpenDelete] = useState(false);
  const [openDuplicate, setOpenDuplicate] = useState(false);
  const [openUnpublish, setOpenUnpublish] = useState(false);

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
    onSubmit("duplicate");
  };
  const handleUnpublishSuccess = () => {
    setOpenUnpublish(false);
    onSubmit("unpublish");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
          <DropdownMenuItem
            onClick={handleUnpublishOpen}
            className="cursor-pointer"
            disabled={!content.published}
          >
            <UnPublishIcon className="mr-1" width={14} height={14} />
            Unpublish
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDuplicateOpen}
            className="cursor-pointer"
          >
            <CopyIcon className="mr-1" width={15} height={15} />
            Duplicate flow
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 cursor-pointer"
            onClick={handleOnClick}
            disabled={content.published}
          >
            <Delete2Icon className="mr-1" />
            Delete flow
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContentDuplicateForm
        content={content}
        open={openDuplicate}
        onOpenChange={setOpenDuplicate}
        onSuccess={handleDuplicateSuccess}
        name="flow"
      />
      <ContentDeleteForm
        name="flow"
        content={content}
        open={openDelete}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          onSubmit("delete");
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

ContentEditDropdownMenu.displayName = "ContentEditDropdownMenu";
