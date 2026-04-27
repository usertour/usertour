import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { ColorPickerPanel } from '@usertour-packages/shared-components';
import { useId, useState } from 'react';
import { fieldControlColClass, fieldRowClass, labelClass } from '../ui/tokens';
import { BuilderColorButton } from '../ui';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
  allowAuto?: boolean;
}

export function ColorField({ value, onChange, label, allowAuto = false }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const isAuto = value === 'Auto';

  return (
    <div className={fieldRowClass}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className={fieldControlColClass}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <BuilderColorButton id={id} color={value} />
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
                onChange(autoFlag ? 'Auto' : color || '');
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
