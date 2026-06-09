import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  ColorPickerPanel,
  CompactColorButton,
} from '@usertour/ui';
import { useCurrentUserId } from '@usertour/hooks';
import { cn } from '@usertour/tailwind';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuilderContext } from '../builder-context';
import { getPath } from '../draft-util';

interface CellProps {
  path: string;
  label: string;
  allowAuto: boolean;
  position: 'left' | 'middle' | 'right';
}

const Cell = (props: CellProps) => {
  const { path, label, allowAuto, position } = props;
  const id = useId();
  const [open, setOpen] = useState(false);
  const { finalSettings, getField, setField, isReadOnly } = useBuilderContext();
  const userId = useCurrentUserId();
  const { t } = useTranslation();
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
      <label htmlFor={id} className="text-sm font-medium leading-none">
        {label}
      </label>
      <Popover open={open} onOpenChange={isReadOnly ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <CompactColorButton
            id={id}
            color={displayedColor}
            isAuto={isAuto}
            disabled={isReadOnly}
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
            userId={userId}
            onChange={(autoFlag, color) => {
              setOpen(false);
              setField(path, autoFlag ? 'Auto' : color || '');
            }}
            labels={{
              useThisColor: t('common.colorPicker.useThisColor'),
              removeColor: t('common.colorPicker.removeColor'),
              tailwindColors: t('common.colorPicker.tailwindColors'),
              recentlyUsed: t('common.colorPicker.recentlyUsed'),
              done: t('common.colorPicker.done'),
              colorPicker: t('common.colorPicker.colorPicker'),
              colorPalette: t('common.colorPicker.colorPalette'),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export interface TripleColorFieldProps {
  paths: [string, string, string];
  labels: [string, string, string];
  allowAuto?: [boolean, boolean, boolean];
}

export const TripleColorField = (props: TripleColorFieldProps) => {
  const { paths, labels, allowAuto } = props;
  const auto = allowAuto ?? [false, false, false];
  return (
    <div className="flex w-full">
      <Cell path={paths[0]} label={labels[0]} allowAuto={auto[0]} position="left" />
      <Cell path={paths[1]} label={labels[1]} allowAuto={auto[1]} position="middle" />
      <Cell path={paths[2]} label={labels[2]} allowAuto={auto[2]} position="right" />
    </div>
  );
};
