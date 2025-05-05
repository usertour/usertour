'use client';

import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { ColumnDef, Row } from '@tanstack/react-table';
import { BizSession, ContentDataType } from '@usertour-ui/types';
import { formatDistanceToNow } from 'date-fns';
import { DataTableColumnHeader } from './data-table-column-header';
import {
  ChecklistProgressColumn,
  FlowProgressColumn,
  LauncherProgressColumn,
} from '@/components/molecules/session';

const ProgressColumn = (props: Row<BizSession>) => {
  const { content } = useContentDetailContext();
  const { eventList } = useEventListContext();
  const { version } = useContentVersionContext();
  const contentType = content?.type;

  if (!eventList || !content || !version) {
    return <></>;
  }

  if (contentType === ContentDataType.CHECKLIST) {
    return (
      <ChecklistProgressColumn original={props.original} eventList={eventList} version={version} />
    );
  }

  if (contentType === ContentDataType.FLOW) {
    return <FlowProgressColumn original={props.original} eventList={eventList} />;
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return <LauncherProgressColumn original={props.original} eventList={eventList} />;
  }

  return <></>;
};

const CreateAtColumn = ({ original }: Row<BizSession>) => {
  const { bizEvent, createdAt } = original;

  // If no events, show creation time
  if (!bizEvent?.length) {
    return (
      <div className="flex space-x-2">
        {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
      </div>
    );
  }

  // Get the most recent event time using Math.max
  const lastEventTime = Math.max(...bizEvent.map((event) => new Date(event.createdAt).getTime()));

  return (
    <div className="flex space-x-2">
      {formatDistanceToNow(new Date(lastEventTime), { addSuffix: true })}
    </div>
  );
};

export const columns: ColumnDef<BizSession>[] = [
  {
    accessorKey: 'bizUserId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => {
      const { environment } = useAppContext();
      const href = `/env/${environment?.id}/user/${row.getValue('bizUserId')}`;
      return (
        <a
          href={href}
          className="text-muted-foreground hover:text-primary hover:underline underline-offset-4 "
        >
          {row.original.bizUser?.externalId}
        </a>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'progress',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Progress" />,
    cell: ({ row }) => <ProgressColumn {...row} />,
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last activity" />,
    cell: ({ row }) => <CreateAtColumn {...row} />,
    enableSorting: false,
  },
];
