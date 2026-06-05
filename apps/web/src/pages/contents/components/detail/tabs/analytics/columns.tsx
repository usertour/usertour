'use client';

import { useAppContext } from '@/contexts/app-context';
import { ColumnDef, Row } from '@tanstack/react-table';
import {
  type BizSession,
  type Content,
  ContentDataType,
  type ContentVersion,
  type Event,
} from '@usertour/types';
import { format, formatDistanceToNow } from 'date-fns';
import { DataTableColumnHeader } from './data-table-column-header';
import {
  BannerProgressCell,
  ChecklistProgressCell,
  FlowProgressCell,
  LauncherProgressCell,
  ResourceCenterProgressCell,
  SessionStatusBadge,
} from '@/components/sessions/session-analytics';
import {
  DefaultAvatar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { Link } from 'react-router-dom';
import type { TFunction } from 'i18next';

// Per-row content / version / event data is identical across all 20
// rows in the table — they're all sessions for the same content. The
// owning `BizSessionsDataTable` fetches it once and passes it via this
// shared context so each row cell just reads from closure instead of
// instantiating its own `cache-and-network` ObservableQuery (which was
// roughly 80 redundant subscriptions per visible page before).

export interface ColumnContext {
  content: Content | null;
  version: ContentVersion | null;
  eventList: Event[] | undefined;
}

interface ProgressCellProps {
  row: Row<BizSession>;
  ctx: ColumnContext;
}

const ProgressCell = (props: ProgressCellProps) => {
  const { row, ctx } = props;
  const { content, version, eventList } = ctx;
  const contentType = content?.type;

  if (!eventList || !content || !version) {
    return null;
  }

  if (contentType === ContentDataType.CHECKLIST) {
    return (
      <ChecklistProgressCell original={row.original} eventList={eventList} version={version} />
    );
  }
  if (contentType === ContentDataType.FLOW) {
    return <FlowProgressCell original={row.original} eventList={eventList} />;
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

interface StatusCellProps {
  row: Row<BizSession>;
  ctx: ColumnContext;
}

const StatusCell = (props: StatusCellProps) => {
  const { row, ctx } = props;
  if (!ctx.content?.type) {
    return null;
  }
  return <SessionStatusBadge original={row.original} contentType={ctx.content.type} />;
};

const LastActivityCell = (props: { row: Row<BizSession> }) => {
  const { row } = props;
  const { bizEvent, createdAt } = row.original;

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

const UserCell = (props: { row: Row<BizSession> }) => {
  const { row } = props;
  const { environment } = useAppContext();

  const bizUser = row.original.bizUser;
  const bizCompany = row.original.bizCompany;
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
        onClick={(event) => event.stopPropagation()}
      >
        {companyName}
      </Link>,
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      <DefaultAvatar seed={externalId || email} name={name} size="md" />
      <div className="flex flex-col min-w-0">
        <Link
          to={`/env/${environment?.id}/user/${bizUser?.id ?? row.original.bizUserId}`}
          className="text-sm font-medium truncate hover:text-primary hover:underline underline-offset-4"
          onClick={(event) => event.stopPropagation()}
        >
          {primaryText}
        </Link>
        {secondaryParts.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            {secondaryParts.map((part, index) => (
              <span key={index} className="flex items-center gap-1.5 min-w-0">
                {index > 0 && <span className="shrink-0">·</span>}
                {part}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const buildColumns = (ctx: ColumnContext, t: TFunction): ColumnDef<BizSession>[] => [
  {
    accessorKey: 'bizUserId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('contents.analytics.sessionsTable.user')} />
    ),
    cell: ({ row }) => <UserCell row={row} />,
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('contents.analytics.sessionsTable.status')} />
    ),
    cell: ({ row }) => <StatusCell row={row} ctx={ctx} />,
    enableSorting: false,
  },
  {
    accessorKey: 'progress',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('contents.analytics.sessionsTable.progress')}
      />
    ),
    cell: ({ row }) => <ProgressCell row={row} ctx={ctx} />,
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('contents.analytics.sessionsTable.lastActivity')}
      />
    ),
    cell: ({ row }) => <LastActivityCell row={row} />,
    enableSorting: false,
  },
];
