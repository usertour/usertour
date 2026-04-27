import { EditIcon } from '@usertour-packages/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import { useEffect, useState } from 'react';
import { BuilderInput } from '../ui';

interface Props {
  value: string;
  onRename: (name: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

// Click the title (or pencil icon) to open a small popover with a Name input.
// Enter or blur commits, Esc cancels.
export function EditableTitle({ value, onRename, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(trimmed);
    } catch {
      // Toast raised by the rename callback; just close.
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'group flex items-center gap-1 -mx-1 rounded px-1 text-xs font-medium text-foreground transition-colors',
            disabled ? 'cursor-default' : 'cursor-pointer hover:bg-muted/40',
            className,
          )}
          title={disabled ? undefined : 'Click to rename'}
        >
          <span className="truncate">{value}</span>
          {!disabled && (
            <EditIcon
              width={12}
              height={12}
              className="shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={8}
        className="w-72 rounded-[15px] border-0 p-3 shadow-popper"
      >
        <div className="grid grid-cols-[60px_1fr] items-center gap-x-3 gap-y-2">
          <label
            htmlFor="theme-name-input"
            className="text-[11px] font-medium text-muted-foreground"
          >
            Name
          </label>
          <BuilderInput
            id="theme-name-input"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            onBlur={commit}
            disabled={saving}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
