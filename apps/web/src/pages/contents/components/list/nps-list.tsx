import { ContentListSkeleton } from '@/components/molecules/skeleton';
import { useContentListContext } from '@/contexts/content-list-context';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { Separator } from '@usertour-ui/separator';
import { useState } from 'react';
import { EmptyPlaceholder } from '../shared/empty-placeholder';
import { NpsCreateForm } from '../shared/nps-create-form';
import { DataTable } from './data-table';
import { useAppContext } from '@/contexts/app-context';

export const NpsListContent = () => {
  const [open, setOpen] = useState(false);
  const { isViewOnly } = useAppContext();

  const openCreateFormHandler = async () => {
    setOpen(true);
  };

  const { contents, refetch, isLoading } = useContentListContext();
  const handleOnClose = async () => {
    setOpen(false);
    refetch();
  };

  return (
    <div className="flex flex-col flex-shrink min-w-0 px-4 py-6 lg:px-8 grow">
      <div className="flex justify-between">
        <>
          <div className="flex flex-col space-y-1 ">
            <h3 className="text-2xl font-semibold tracking-tight">NPS Survey</h3>
            <div className="flex flex-row space-x-1">
              <p className="text-sm text-muted-foreground">
                The NPS feature enables you to gather immediate, context-specific feedback directly
                within your product.
              </p>
            </div>
          </div>
          <Button onClick={openCreateFormHandler} className="flex-none" disabled={isViewOnly}>
            <PlusCircledIcon className="mr-2 h-4 w-4" />
            Create Nps
          </Button>
        </>
      </div>
      <Separator className="my-6" />
      {isLoading && <ContentListSkeleton count={9} />}
      {!isLoading && contents && contents.length === 0 && (
        <EmptyPlaceholder>
          <Button onClick={openCreateFormHandler} disabled={isViewOnly}>
            <PlusCircledIcon className="mr-2 h-4 w-4" />
            Create Nps
          </Button>
        </EmptyPlaceholder>
      )}
      {!isLoading && contents && contents.length > 0 && <DataTable />}
      <NpsCreateForm isOpen={open} onClose={handleOnClose} />
    </div>
  );
};

NpsListContent.displayName = 'NpsListContent';
