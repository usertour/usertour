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
}

const chipClass: Record<VersionRowChip['kind'], string> = {
  draft: 'bg-success/15 text-success hover:bg-success/15',
  live: 'bg-success/15 text-success hover:bg-success/15',
};

const chipLabel = (chip: VersionRowChip): string => {
  if (chip.kind === 'draft') return 'Current draft';
  return `Live in ${chip.environmentName}`;
};

export const VersionRow = ({ version, chips = [], showCreatedLabel = false }: VersionRowProps) => {
  const createdAt = new Date(version.createdAt ?? Date.now());
  const updatedAt = new Date(version.updatedAt ?? version.createdAt ?? Date.now());
  const hasChips = chips.length > 0;

  return (
    <div
      className={cn(
        'group grid items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50',
        hasChips ? 'grid-cols-[64px_190px_1fr_auto]' : 'grid-cols-[64px_1fr_auto]',
      )}
    >
      <span className="text-sm font-semibold tabular-nums">v{version.sequence + 1}</span>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-muted-foreground cursor-default truncate">
              {showCreatedLabel ? 'Created ' : ''}
              {formatDistanceToNowStrict(createdAt, { addSuffix: true })}
            </span>
          </TooltipTrigger>
          <TooltipContent>{format(createdAt, 'PPpp')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {hasChips && (
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
      )}

      <div className="text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
        <ContentVersionAction version={version} />
      </div>
    </div>
  );
};

VersionRow.displayName = 'VersionRow';
