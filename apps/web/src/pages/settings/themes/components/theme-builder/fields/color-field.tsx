import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { ColorPickerPanel } from '@usertour-packages/shared-components';
import { useId, useState } from 'react';
import { useBuilderContext } from '../builder-context';
import { getPath } from '../draft-util';
import type { ColorResolver } from '../schema/types';
import { BuilderColorButton } from '../ui';
import { FieldRow } from './field-row';

interface Props {
  path: string;
  label: string;
  allowAuto?: boolean;
  autoFallback?: ColorResolver;
  vertical?: boolean;
}

export function ColorField({ path, label, allowAuto = false, autoFallback, vertical }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { activeSettings, finalSettings, getField, setField } = useBuilderContext();
  const value = getField<string>(path) ?? '';
  const isAuto = value === 'Auto';

  // Resolved Auto color: explicit `autoFallback` wins, otherwise fall back to
  // the same path resolved by `convertSettings`. This mirrors v1's autoColor
  // prop, where most fields reused `finalSettings[path]` and a few overrode.
  const fallback = autoFallback?.(activeSettings) ?? getPath(finalSettings, path);
  const displayedColor = isAuto ? (typeof fallback === 'string' ? fallback : '#FFFFFF') : value;

  return (
    <FieldRow label={label} htmlFor={id} forceVertical={vertical}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <BuilderColorButton id={id} color={displayedColor} isAuto={isAuto} />
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
    </FieldRow>
  );
}
