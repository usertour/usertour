import {
  ActivityLogIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@radix-ui/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuerySessionDetailQuery } from '@usertour-ui/shared-hooks';
import { Table, TableBody, TableCell, TableRow } from '@usertour-ui/table';
import { BizEvent, BizEvents } from '@usertour-ui/types';
import { format, formatDistanceToNow } from 'date-fns';
import { useState, Fragment } from 'react';
import { useAttributeListContext } from '@/contexts/attribute-list-context';

interface SessionDetailContentProps {
  environmentId: string;
  sessionId: string;
}

export function SessionDetailContent(props: SessionDetailContentProps) {
  const { environmentId, sessionId } = props;
  const navigator = useNavigate();
  const { session } = useQuerySessionDetailQuery(sessionId);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const { attributeList } = useAttributeListContext();

  const handleRowClick = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const startEvent = session?.bizEvent?.find(
    (bizEvent) => bizEvent.event?.codeName === BizEvents.FLOW_STARTED,
  );

  return (
    <>
      <div className="border-b bg-white flex-col md:flex w-full fixed">
        <div className="flex h-16 items-center px-4">
          <ArrowLeftIcon
            className="ml-4 h-6 w-8 cursor-pointer"
            onClick={() => {
              navigator(`/env/${environmentId}/users`);
            }}
          />
          <span>Session Detail</span>
        </div>
      </div>
      <div className="flex flex-col space-y-6 w-full max-w-screen-xl mx-auto p-14 mt-12  ">
        <div className="flex flex-row px-4 py-6 gap-4 grow shadow bg-white rounded-lg ">
          <div className=" w-full  grid grid-cols-2 gap-2 gap-x-12">
            <div className="border-b flex flex-col">
              <span className="text-sm text-foreground/60">User</span>
              <Link
                className="text-primary"
                to={`/env/${environmentId}/user/${session?.bizUser?.id}`}
              >
                {session?.bizUser?.data?.name ?? 'Unnamed user'}
              </Link>
            </div>
            <div className="border-b flex flex-col ">
              <span className="text-sm text-foreground/60">Flow</span>
              <Link
                className=" text-primary"
                to={`/env/${environmentId}/flows/${session?.content?.id}`}
              >
                {session?.content?.name}
              </Link>
            </div>
            <div className="border-b flex flex-col">
              <span className="text-sm text-foreground/60">Version</span>
              <Link
                className="text-primary"
                to={`/env/${environmentId}/flows/${session?.content?.id}/versions`}
              >
                V{session?.version?.sequence}
              </Link>
            </div>
            <div className="border-b flex flex-col">
              <span className="text-sm text-foreground/60">Started</span>
              <span>
                {session?.createdAt && formatDistanceToNow(new Date(session?.createdAt))} ago
              </span>
            </div>
            <div className="border-b flex flex-col">
              <span className="text-sm text-foreground/60">Start reason</span>
              <span>{startEvent?.data?.flow_start_reason}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full px-4 py-6 grow shadow bg-white rounded-lg">
          <div className="mb-2 flex flex-row items-center font-bold	">
            <ActivityLogIcon width={18} height={18} className="mr-2" />
            Activity feed
          </div>
          <div className="flex flex-col items-center w-full h-full justify-center">
            <Table>
              <TableBody>
                {session?.bizEvent ? (
                  session?.bizEvent.map((bizEvent: BizEvent) => (
                    <Fragment key={bizEvent.id}>
                      <TableRow
                        className="cursor-pointer  h-10 group"
                        onClick={() => handleRowClick(bizEvent.id)}
                      >
                        <TableCell className="w-1/4">
                          {format(new Date(bizEvent.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                        <TableCell className="flex justify-between items-center">
                          {bizEvent.event?.displayName}
                          {expandedRowId === bizEvent.id ? (
                            <ChevronUpIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRowId === bizEvent.id && (
                        <TableRow>
                          <TableCell colSpan={2} className="bg-gray-50 p-4">
                            <div className="text-sm">
                              {Object.entries(bizEvent.data || {}).map(([key, value]) => (
                                <div key={key} className="py-2 border-b flex flex-row">
                                  <span className="font-medium w-[200px] flex-none">
                                    {attributeList?.find((attr) => attr.codeName === key)
                                      ?.displayName || key}
                                  </span>
                                  <span className="grow">
                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="h-24 text-center">No results.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}

SessionDetailContent.displayName = 'SessionDetailContent';
