import { ContentListSkeleton } from '@/components/molecules/skeleton';
import { useContentListContext } from '@/contexts/content-list-context';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { isInstalledExtension } from '@usertour-ui/builder';
import { Button } from '@usertour-ui/button';
import { Separator } from '@usertour-ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour-ui/tabs';
import { useState } from 'react';
import { EmptyPlaceholder } from '../shared/empty-placeholder';
import { ExtensionInstallDialog } from '../shared/extension-install-dialog';
import { NpsCreateForm } from '../shared/nps-create-form';
import { DataTable } from './data-table';
import { useAppContext } from '@/contexts/app-context';

export const NpsListContent = () => {
  const [open, setOpen] = useState(false);
  const [isOpenedInstall, setIsOpenedInstall] = useState(false);
  const { isViewOnly } = useAppContext();

  const openCreateFormHandler = async () => {
    const isInstalled = await isInstalledExtension();
    if (!isInstalled) {
      setIsOpenedInstall(true);
    } else {
      setOpen(true);
    }
  };

  const { contents, refetch, setQuery, isLoading } = useContentListContext();
  const handleOnClose = async () => {
    setOpen(false);
    refetch();
  };

  const handleOnValueChange = async (value: string) => {
    if (value === 'published') {
      setQuery({ published: true });
    } else {
      setQuery({});
    }
  };

  const handleOnInstalled = () => {
    setIsOpenedInstall(false);
    setOpen(true);
  };

  return (
    <div className="h-full px-4 py-6 lg:px-8 lg:border-l shadow bg-white rounded-lg grow">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-1 ">
          <h3 className="text-2xl font-semibold tracking-tight">NPS</h3>
          <div className="flex flex-row space-x-1">
            <p className="text-sm text-muted-foreground">
              The NPS feature enables you to gather immediate, context-specific feedback directly
              within your product.
            </p>
          </div>
        </div>
      </div>
      <Separator className="my-4" />
      <Tabs defaultValue="all" className="h-full space-y-6" onValueChange={handleOnValueChange}>
        <div className="space-between flex items-center">
          <TabsList>
            <TabsTrigger value="all" className="relative">
              All
            </TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
          </TabsList>
          <div className="ml-auto">
            <Button onClick={openCreateFormHandler} disabled={isViewOnly}>
              <PlusCircledIcon className="mr-2 h-4 w-4" />
              Create Nps
            </Button>
          </div>
        </div>
        {isLoading && <ContentListSkeleton count={9} />}
        {!isLoading && contents && contents.length === 0 && (
          <EmptyPlaceholder
            name="No nps added"
            description="You have not added any nps. Add one below."
          >
            <Button onClick={openCreateFormHandler} disabled={isViewOnly}>
              <PlusCircledIcon className="mr-2 h-4 w-4" />
              Create Nps
            </Button>
          </EmptyPlaceholder>
        )}
        {!isLoading && contents && contents.length > 0 && (
          <>
            <TabsContent value="all" className="border-none p-0 outline-none">
              <DataTable />
            </TabsContent>
            <TabsContent
              value="published"
              className="h-full flex-col border-none p-0 data-[state=active]:flex"
            >
              <DataTable />
            </TabsContent>
          </>
        )}
      </Tabs>
      <NpsCreateForm isOpen={open} onClose={handleOnClose} />
      <ExtensionInstallDialog
        isOpen={isOpenedInstall}
        onInstalled={handleOnInstalled}
        onOpenChange={setIsOpenedInstall}
      />
    </div>
  );
};

NpsListContent.displayName = 'NpsListContent';
