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
}

const chipClass: Record<VersionRowChip['kind'], string> = {
  draft: 'bg-success/15 text-success hover:bg-success/15',
  live: 'bg-success/15 text-success hover:bg-success/15',
};

const chipLabel = (chip: VersionRowChip): string => {
  if (chip.kind === 'draft') return 'Current draft';
  return `Live in ${chip.environmentName}`;
};

export const VersionRow = ({ version, chips = [] }: VersionRowProps) => {
  const updatedAt = new Date(version.updatedAt ?? version.createdAt ?? Date.now());

  return (
    <div
      className={cn(
        'group grid grid-cols-[64px_190px_1fr_auto] items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50',
      )}
    >
      <span className="text-sm font-semibold tabular-nums">v{version.sequence + 1}</span>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-muted-foreground cursor-default truncate">
              Updated {formatDistanceToNowStrict(updatedAt, { addSuffix: true })}
            </span>
          </TooltipTrigger>
          <TooltipContent>{format(updatedAt, 'PPpp')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

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

      <div className="text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
        <ContentVersionAction version={version} />
      </div>
    </div>
  );
};

VersionRow.displayName = 'VersionRow';
