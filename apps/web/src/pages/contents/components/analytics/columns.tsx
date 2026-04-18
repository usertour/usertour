'use client';

import { useAppContext } from '@/contexts/app-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { ColumnDef, Row } from '@tanstack/react-table';
import { BizSession, ContentDataType } from '@usertour/types';
import { format, formatDistanceToNow } from 'date-fns';
import { DataTableColumnHeader } from './data-table-column-header';
import {
  BannerProgressCell,
  ChecklistProgressCell,
  FlowProgressCell,
  LauncherProgressCell,
  ResourceCenterProgressCell,
  SessionStatusBadge,
} from '@/components/molecules/session-analytics';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

const ProgressCell = (props: Row<BizSession>) => {
  const { content } = useContentDetailContext();
  const { eventList } = useEventListContext();
  const { version } = useContentVersionContext();
  const contentType = content?.type;

  if (!eventList || !content || !version) {
    return null;
  }

  if (contentType === ContentDataType.CHECKLIST) {
    return (
      <ChecklistProgressCell original={props.original} eventList={eventList} version={version} />
    );
  }
  if (contentType === ContentDataType.FLOW) {
    return <FlowProgressCell original={props.original} eventList={eventList} />;
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return <LauncherProgressCell />;
  }
  if (contentType === ContentDataType.BANNER) {
    return <BannerProgressCell />;
  }
  if (contentType === ContentDataType.RESOURCE_CENTER) {
    return <ResourceCenterProgressCell />;
  }
  return null;
};

const StatusCell = ({ original }: Row<BizSession>) => {
  const { content } = useContentDetailContext();
  if (!content?.type) return null;
  return <SessionStatusBadge original={original} contentType={content.type} />;
};

const LastActivityCell = ({ original }: Row<BizSession>) => {
  const { bizEvent, createdAt } = original;

  const lastTime = bizEvent?.length
    ? new Date(Math.max(...bizEvent.map((event) => new Date(event.createdAt).getTime())))
    : new Date(createdAt);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm text-muted-foreground cursor-default">
            {formatDistanceToNow(lastTime, { addSuffix: true })}
          </span>
        </TooltipTrigger>
        <TooltipContent>{format(lastTime, 'PPpp')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const UserCell = ({ original }: Row<BizSession>) => {
  const { environment } = useAppContext();

  const bizUser = original.bizUser;
  const bizCompany = original.bizCompany;
  const email = bizUser?.data?.email || '';
  const name = bizUser?.data?.name || '';
  const externalId = bizUser?.externalId || '';

  const primaryText = name || email || externalId;
  const showEmail = email && primaryText !== email ? email : null;
  const companyName = bizCompany?.data?.name || bizCompany?.externalId || bizCompany?.id || '';

  const secondaryParts: React.ReactNode[] = [];
  if (showEmail) {
    secondaryParts.push(
      <span key="email" className="truncate">
        {showEmail}
      </span>,
    );
  }
  if (companyName && bizCompany?.id) {
    secondaryParts.push(
      <Link
        key="company"
        to={`/env/${environment?.id}/company/${bizCompany.id}`}
        className="truncate hover:text-primary hover:underline underline-offset-4"
        onClick={(e) => e.stopPropagation()}
      >
        {companyName}
      </Link>,
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      <UserAvatar email={email} name={name} size="md" />
      <div className="flex flex-col min-w-0">
        <Link
          to={`/env/${environment?.id}/user/${bizUser?.id ?? original.bizUserId}`}
          className="text-sm font-medium truncate hover:text-primary hover:underline underline-offset-4"
          onClick={(e) => e.stopPropagation()}
        >
          {primaryText}
        </Link>
        {secondaryParts.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            {secondaryParts.map((part, idx) => (
              <span key={idx} className="flex items-center gap-1.5 min-w-0">
                {idx > 0 && <span className="shrink-0">·</span>}
                {part}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const columns: ColumnDef<BizSession>[] = [
  {
    accessorKey: 'bizUserId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => <UserCell {...row} />,
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusCell {...row} />,
    enableSorting: false,
  },
  {
    accessorKey: 'progress',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Progress" />,
    cell: ({ row }) => <ProgressCell {...row} />,
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last activity" />,
    cell: ({ row }) => <LastActivityCell {...row} />,
    enableSorting: false,
  },
];
