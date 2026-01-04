import { ListSkeleton } from '@/components/molecules/skeleton';
import { useEventListContext } from '@/contexts/event-list-context';
import { Event } from '@usertour/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { format } from 'date-fns';
import { EventListAction } from './event-list-action';

export const EventListContent = () => {
  const { eventList, loading, isRefetching } = useEventListContext();

  if (loading || isRefetching) {
    return <ListSkeleton />;
  }

  return (
    <>
      <div className="rounded-md border-none">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Display name</TableHead>
              <TableHead>Code name</TableHead>
              <TableHead className="w-60">CreatedAt</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventList ? (
              eventList?.map((event: Event) => (
                <TableRow className="cursor-pointer" key={event.id} onClick={() => {}}>
                  <TableCell className="truncate">
                    {event.description ? (
                      <div className="flex flex-col">
                        <span className="truncate">{event.displayName}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {event.description}
                        </span>
                      </div>
                    ) : (
                      event.displayName
                    )}
                  </TableCell>
                  <TableCell className="truncate">{event.codeName}</TableCell>
                  <TableCell>{format(new Date(event.createdAt), 'PPpp')}</TableCell>
                  <TableCell>
                    <EventListAction event={event} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

EventListContent.displayName = 'EventListContent';
