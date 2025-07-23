import { useMutation } from '@apollo/client';
import { ChevronDownIcon, EnterIcon, OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { isInstalledExtension } from '@usertour-packages/builder';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { createContentVersion } from '@usertour-packages/gql';
import { Separator } from '@usertour-packages/separator';
import { getErrorMessage } from '@usertour-packages/utils';
import { BuilderType, Content } from '@usertour-packages/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ContentEditForm } from './content-edit-form';
import { ExtensionInstallDialog } from './extension-install-dialog';

interface ContentDetailBuilderProps {
  content: Content;
}

export const ContentOpenBuilder = (props: ContentDetailBuilderProps) => {
  const { content } = props;
  const [open, setOpen] = useState(false);
  const [showBuilderType, setShowBuilderType] = useState(true);
  const { contentId = '', contentType } = useParams();
  const navigate = useNavigate();
  const [isOpenedInstall, setIsOpenedInstall] = useState(false);
  const [builderType, setBuilderType] = useState<BuilderType | undefined>();
  const [createVersion] = useMutation(createContentVersion);
  const { toast } = useToast();

  const handleOpenWebBuilder = useCallback(async () => {
    const isInstalled = await isInstalledExtension();
    if (!isInstalled) {
      setBuilderType(BuilderType.WEB);
      setIsOpenedInstall(true);
      return;
    }
    let versionId = content.editedVersionId;
    if (content?.published && content.editedVersionId === content.publishedVersionId) {
      const { data } = await createVersion({
        variables: {
          data: {
            versionId: content.editedVersionId,
          },
        },
      });
      if (!data?.createContentVersion?.id) {
        return toast({
          variant: 'destructive',
          title: 'Failed to create a new version.',
        });
      }
      versionId = data?.createContentVersion?.id;
    }
    navigate(`/env/${content.environmentId}/${contentType}/${contentId}/builder/${versionId}`);
  }, [content]);

  const handleOpenBuilder = async () => {
    const isInstalled = await isInstalledExtension();
    if (!isInstalled) {
      setBuilderType(BuilderType.ALL);
      setIsOpenedInstall(true);
    } else {
      setShowBuilderType(true);
      setOpen(true);
    }
  };

  const handleOpenExtensionBuilder = async () => {
    const isInstalled = await isInstalledExtension();

    if (!isInstalled) {
      setBuilderType(BuilderType.EXTENSION);
      setIsOpenedInstall(true);
    } else {
      setShowBuilderType(false);
      setOpen(true);
    }
  };

  const handleOnInstalled = useCallback(async () => {
    if (open) {
      return;
    }
    setIsOpenedInstall(false);
    try {
      if (builderType === BuilderType.ALL) {
        await handleOpenBuilder();
      } else if (builderType === BuilderType.WEB) {
        await handleOpenWebBuilder();
      } else if (builderType === BuilderType.EXTENSION) {
        await handleOpenExtensionBuilder();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [builderType, open]);

  return (
    <>
      <div className="flex flex-row items-center min-w-52	">
        <Button
          type="button"
          variant={'outline'}
          onClick={handleOpenBuilder}
          className="rounded-r-none border-r-0 relative	"
        >
          <OpenInNewWindowIcon className="mr-2" />
          Edit In Builder
          <Separator orientation="vertical" className="h-[20px] absolute right-0" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={'outline'} className="rounded-l-none border-l-0	">
              <ChevronDownIcon className="h-4 w-4 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[360px]" forceMount>
            <DropdownMenuItem
              className="cursor-pointer flex flex-col items-start	"
              onClick={handleOpenExtensionBuilder}
            >
              <div className="flex flex-row items-center">
                <OpenInNewWindowIcon className="mr-2" />
                Edit In Extension Builder
              </div>
              <div className="text-xs	 text-muted-foreground">
                Open the builder in new tab for WYSIWYG editing experience
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer flex flex-col items-start	"
              onClick={handleOpenWebBuilder}
            >
              <div className="flex flex-row items-center">
                <EnterIcon className="mr-2" />
                Edit In Web Builder
              </div>
              <div className="text-xs	 text-muted-foreground">
                Open the builder in the current tab for convenient editing experience
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ContentEditForm
          content={content}
          onOpenChange={setOpen}
          open={open}
          showBuilderType={showBuilderType}
        />
        <ExtensionInstallDialog
          isOpen={isOpenedInstall}
          onInstalled={handleOnInstalled}
          onOpenChange={setIsOpenedInstall}
        />
      </div>
    </>
  );
};

ContentOpenBuilder.displayName = 'ContentOpenBuilder';
