import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { ColorPickerPanel } from '@usertour-packages/shared-components';
import { cn } from '@usertour-packages/tailwind';
import { useId, useState } from 'react';
import { useBuilderContext } from '../builder-context';
import { getPath } from '../draft-util';
import { BuilderColorButton } from '../ui';

interface CellProps {
  path: string;
  label: string;
  allowAuto: boolean;
  position: 'left' | 'middle' | 'right';
}

function Cell({ path, label, allowAuto, position }: CellProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { finalSettings, getField, setField } = useBuilderContext();
  const value = getField<string>(path) ?? '';
  const isAuto = value === 'Auto';
  const fallback = getPath(finalSettings, path);
  const displayedColor = isAuto ? (typeof fallback === 'string' ? fallback : '#FFFFFF') : value;

  // Visually joined: only round the outer corners and remove the inner edges.
  const radiusClass =
    position === 'left'
      ? 'rounded-r-none'
      : position === 'right'
        ? 'rounded-l-none'
        : 'rounded-none';

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium leading-none">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <BuilderColorButton
            id={id}
            color={displayedColor}
            className={cn(radiusClass, 'w-full')}
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-auto border-none bg-transparent p-0 shadow-none drop-shadow-popover"
        >
          <ColorPickerPanel
            color={isAuto ? '#FFFFFF' : value}
            isAuto={isAuto}
            showAutoButton={allowAuto}
            onChange={(autoFlag, color) => {
              setOpen(false);
              setField(path, autoFlag ? 'Auto' : color || '');
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface Props {
  paths: [string, string, string];
  labels: [string, string, string];
  allowAuto?: [boolean, boolean, boolean];
}

export function TripleColorField({ paths, labels, allowAuto }: Props) {
  const auto = allowAuto ?? [false, false, false];
  return (
    <div className="flex w-full">
      <Cell path={paths[0]} label={labels[0]} allowAuto={auto[0]} position="left" />
      <Cell path={paths[1]} label={labels[1]} allowAuto={auto[1]} position="middle" />
      <Cell path={paths[2]} label={labels[2]} allowAuto={auto[2]} position="right" />
    </div>
  );
}
