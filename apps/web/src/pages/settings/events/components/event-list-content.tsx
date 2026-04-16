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
import { Badge } from '@usertour-packages/badge';
import { RiShieldCheckFill } from '@usertour-packages/icons';
import { EventListAction } from './event-list-action';

export const EventListContent = () => {
  const { eventList, loading, isRefetching } = useEventListContext();

  if (loading || isRefetching) {
    return <ListSkeleton />;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="table-fixed min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Display name</TableHead>
            <TableHead>Code name</TableHead>
            <TableHead className="w-48 hidden lg:table-cell">CreatedAt</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventList ? (
            [...eventList]
              .sort((a, b) => (a.predefined === b.predefined ? 0 : a.predefined ? -1 : 1))
              .map((event: Event) => (
                <TableRow className="cursor-pointer" key={event.id} onClick={() => {}}>
                  <TableCell className="truncate">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5 truncate">
                        {event.displayName}
                        {event.predefined && (
                          <Badge
                            variant="secondary"
                            className="gap-1 px-1.5 py-0 font-normal text-muted-foreground"
                          >
                            <RiShieldCheckFill className="h-3 w-3 text-foreground" />
                            System
                          </Badge>
                        )}
                      </span>
                      {event.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {event.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="truncate">{event.codeName}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {format(new Date(event.createdAt), 'PPpp')}
                  </TableCell>
                  <TableCell>
                    <EventListAction event={event} />
                  </TableCell>
                </TableRow>
              ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

EventListContent.displayName = 'EventListContent';
