import { useEventListContext } from '@/contexts/event-list-context';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@usertour-ui/button';
import { useState } from 'react';
import { EventCreateForm } from './event-create-form';
import { PlusIcon } from 'lucide-react';

export const EventListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useEventListContext();
  const { isViewOnly } = useAppContext();
  const handleCreate = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };
  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">Events</h3>
            <Button onClick={handleCreate} disabled={isViewOnly}>
              <PlusIcon className="w-4 h-4" />
              New Events
            </Button>
          </div>
        </div>
      </div>
      <EventCreateForm isOpen={open} onClose={handleOnClose} />
    </>
  );
};

EventListHeader.displayName = 'EventListHeader';
