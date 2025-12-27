'use client';

import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { ColumnDef, Row } from '@tanstack/react-table';
import { BizSession, ContentDataType } from '@usertour/types';
import { formatDistanceToNow } from 'date-fns';
import { DataTableColumnHeader } from './data-table-column-header';
import {
  ChecklistProgressColumn,
  FlowProgressColumn,
  LauncherProgressColumn,
} from '@/components/molecules/session';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { Link } from 'react-router-dom';

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

      const bizUser = row.original.bizUser;
      const bizCompany = row.original.bizCompany;
      const email = bizUser?.data?.email || '';
      const name = bizUser?.data?.name || '';
      const externalId = bizUser?.externalId || '';

      // Display name or email if available, otherwise show externalId
      const primaryText = name || email || externalId;

      // Second line: show email only if it differs from primaryText
      const showSecondLine = email && primaryText !== email ? email : null;

      // Get company display name
      const companyName = bizCompany?.data?.name || bizCompany?.externalId || bizCompany?.id || '';

      return (
        <div className="flex items-center gap-2">
          <Link
            to={`/env/${environment?.id}/user/${row.getValue('bizUserId')}`}
            className="flex items-center gap-2"
          >
            <UserAvatar email={email} name={name} size="sm" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-medium hover:text-primary hover:underline underline-offset-4">
                  {primaryText}
                </span>
                {companyName && bizCompany?.id && (
                  <span className="text-muted-foreground text-xs">
                    from{' '}
                    <Link
                      to={`/env/${environment?.id}/company/${bizCompany.id}`}
                      className="hover:text-primary hover:underline underline-offset-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {companyName}
                    </Link>
                  </span>
                )}
              </div>
              {showSecondLine && (
                <span className="text-muted-foreground text-xs">{showSecondLine}</span>
              )}
            </div>
          </Link>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'progress',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Progress" />,
    cell: ({ row }) => {
      const { environment } = useAppContext();

      return (
        <Link to={`/env/${environment?.id}/session/${row.original.id}`}>
          <ProgressColumn {...row} />
        </Link>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last activity" />,
    cell: ({ row }) => <CreateAtColumn {...row} />,
    enableSorting: false,
  },
];
