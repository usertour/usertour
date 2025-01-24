import { useEventListContext } from "@/contexts/event-list-context";
import { Event } from "@/types/project";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usertour-ui/table";
import { EventListAction } from "./event-list-action";
import { format } from "date-fns";
import { ListSkeleton } from "@/components/molecules/skeleton";

export const EventListContent = () => {
  const { eventList, loading } = useEventListContext();

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display name</TableHead>
              <TableHead>Code name</TableHead>
              <TableHead>CreatedAt</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventList ? (
              eventList?.map((event: Event) => (
                <TableRow
                  className="cursor-pointer"
                  key={event.id}
                  onClick={() => {}}
                >
                  <TableCell
                    className={event.description ? "flex flex-col" : ""}
                  >
                    {event.displayName}
                    {event.description && (
                      <span className="text-xs text-gray-500">
                        {event.description}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{event.codeName}</TableCell>
                  <TableCell>
                    {format(new Date(event.createdAt), "PPpp")}
                  </TableCell>
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

EventListContent.displayName = "EventListContent";
