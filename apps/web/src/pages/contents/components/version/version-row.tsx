import { Badge } from '@usertour-packages/badge';
import { cn } from '@usertour-packages/tailwind';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { ContentVersion } from '@usertour/types';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ContentVersionAction } from './content-version-action';

export type VersionRowChip =
  | { kind: 'draft' }
  | { kind: 'live'; environmentName: string; publishedAt?: Date };

interface VersionRowProps {
  version: ContentVersion;
  chips?: VersionRowChip[];
  showCreatedLabel?: boolean;
  createdDisplay?: 'relative' | 'absolute' | 'timeOnly';
}

const chipClass: Record<VersionRowChip['kind'], string> = {
  draft: 'bg-success/15 text-success hover:bg-success/15',
  live: 'bg-success/15 text-success hover:bg-success/15',
};

const chipLabel = (chip: VersionRowChip): string => {
  if (chip.kind === 'draft') return 'Current draft';
  return `Live in ${chip.environmentName}`;
};

export const VersionRow = ({
  version,
  chips = [],
  showCreatedLabel = false,
  createdDisplay = 'relative',
}: VersionRowProps) => {
  const createdAt = new Date(version.createdAt ?? Date.now());
  const updatedAt = new Date(version.updatedAt ?? version.createdAt ?? Date.now());
  const hasChips = chips.length > 0;
  const timeFirst = createdDisplay === 'timeOnly';
  const createdText =
    createdDisplay === 'absolute'
      ? format(createdAt, 'PPp')
      : createdDisplay === 'timeOnly'
        ? format(createdAt, 'p')
        : formatDistanceToNowStrict(createdAt, { addSuffix: true });
  const showLabel = showCreatedLabel && createdDisplay !== 'timeOnly';

  const versionCell = (
    <span className="text-sm font-semibold tabular-nums">v{version.sequence + 1}</span>
  );

  const timeCell =
    createdDisplay === 'absolute' ? (
      <span className="text-sm text-muted-foreground truncate tabular-nums">
        {showLabel ? 'Created ' : ''}
        {createdText}
      </span>
    ) : (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'text-sm text-muted-foreground cursor-default truncate w-fit',
                createdDisplay === 'timeOnly' && 'tabular-nums',
              )}
            >
              {showLabel ? 'Created ' : ''}
              {createdText}
            </span>
          </TooltipTrigger>
          <TooltipContent>{format(createdAt, 'PPpp')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

  const chipsCell = hasChips ? (
    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
      {chips.map((chip, idx) => {
        const badge = (
          <Badge
            variant="secondary"
            className={cn('font-medium border-transparent', chipClass[chip.kind])}
          >
            {chipLabel(chip)}
          </Badge>
        );

        if (chip.kind === 'draft') {
          return (
            <span key={`${chip.kind}-${idx}`} className="inline-flex items-center gap-1.5">
              {badge}
              <span className="text-xs text-muted-foreground">
                edited {formatDistanceToNowStrict(updatedAt, { addSuffix: true })}
              </span>
            </span>
          );
        }

        if (chip.kind === 'live' && chip.publishedAt) {
          const publishedAt = new Date(chip.publishedAt);
          return (
            <TooltipProvider key={`${chip.kind}-${idx}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">{badge}</span>
                </TooltipTrigger>
                <TooltipContent>
                  Published {formatDistanceToNowStrict(publishedAt, { addSuffix: true })}
                  <div className="text-xs opacity-70">{format(publishedAt, 'PPpp')}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return <span key={`${chip.kind}-${idx}`}>{badge}</span>;
      })}
    </div>
  ) : null;

  const actionsCell = (
    <div className="text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
      <ContentVersionAction version={version} />
    </div>
  );

  const gridCols = timeFirst
    ? 'grid-cols-[72px_48px_1fr_auto]'
    : hasChips
      ? 'grid-cols-[64px_190px_1fr_auto]'
      : 'grid-cols-[64px_1fr_auto]';

  return (
    <div
      className={cn(
        'group grid items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50',
        gridCols,
      )}
    >
      {timeFirst ? (
        <>
          {timeCell}
          {versionCell}
          <div />
          {actionsCell}
        </>
      ) : (
        <>
          {versionCell}
          {timeCell}
          {chipsCell}
          {actionsCell}
        </>
      )}
    </div>
  );
};

VersionRow.displayName = 'VersionRow';
