import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  ColorPickerPanel,
  CompactColorButton,
} from '@usertour/ui';
import { useCurrentUserId } from '@usertour/hooks';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuilderContext } from '../builder-context';
import { getPath } from '../draft-util';
import type { ColorResolver } from '../schema/types';
import { FieldRow } from './field-row';

export interface ColorFieldProps {
  path: string;
  label: string;
  allowAuto?: boolean;
  autoFallback?: ColorResolver;
  vertical?: boolean;
  tooltip?: string;
}

export const ColorField = (props: ColorFieldProps) => {
  const { path, label, allowAuto = false, autoFallback, vertical, tooltip } = props;
  const id = useId();
  const [open, setOpen] = useState(false);
  const { activeSettings, finalSettings, getField, setField, isReadOnly } = useBuilderContext();
  const userId = useCurrentUserId();
  const { t } = useTranslation();
  const value = getField<string>(path) ?? '';
  const isAuto = value === 'Auto';

  // Resolved Auto color: explicit `autoFallback` wins, otherwise fall back to
  // the same path resolved by `convertSettings`. This mirrors v1's autoColor
  // prop, where most fields reused `finalSettings[path]` and a few overrode.
  const fallback = autoFallback?.(activeSettings) ?? getPath(finalSettings, path);
  const displayedColor = isAuto ? (typeof fallback === 'string' ? fallback : '#FFFFFF') : value;

  return (
    <FieldRow label={label} htmlFor={id} forceVertical={vertical} tooltip={tooltip}>
      <Popover open={open} onOpenChange={isReadOnly ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <CompactColorButton
            id={id}
            color={displayedColor}
            isAuto={isAuto}
            disabled={isReadOnly}
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
    </FieldRow>
  );
};
