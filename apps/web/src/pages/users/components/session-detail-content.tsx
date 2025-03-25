import {
  ActivityLogIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useQuerySessionDetailQuery } from '@usertour-ui/shared-hooks';
import { Table, TableBody, TableCell, TableRow } from '@usertour-ui/table';
import { BizEvent } from '@usertour-ui/types';
import { format } from 'date-fns';
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
      <div className="flex p-14 mt-12 space-x-8 justify-center ">
        <div className="flex flex-col p-4 space-y-6 w-full  max-w-screen-xl mx-auto">
          <div className="flex flex-col w-full space-y-4">
            <div className="flex-1 px-4 py-6 grow shadow bg-white rounded-lg">
              <div className="flex flex-col space-y-2 text-sm py-2">
                <div>Flow: {session?.content?.name}</div>
                <div>createdAt: {session?.createdAt}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col w-full">
            <div className="flex-1 px-4 py-6 grow shadow bg-white rounded-lg">
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
        </div>
      </div>
    </>
  );
}

SessionDetailContent.displayName = 'SessionDetailContent';
