import { EditIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onRename: (name: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

// Inline-editable title. Idle state shows the text and a pencil; click flips
// the same slot into an <input> with the current value preselected. Enter
// or blur commits, Esc discards. Mirrors the Notion / Linear / Figma rename
// pattern — a popover would feel ceremonial for a single text field.
export function EditableTitle({ value, onRename, disabled, className }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the draft in sync with external prop changes while idle. Once the
  // user starts editing, we own the value until commit/cancel.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  // Autofocus + select-all when entering edit mode so the user can either
  // overwrite immediately or click to position the caret.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const beginEdit = () => {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      await onRename(trimmed);
    } catch {
      // onRename surfaces its own error toast; revert the draft so the
      // input shows the last committed name on next edit.
      setDraft(value);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        disabled={saving}
        // The HTML `size` attribute auto-sizes the input to N character
        // widths — universally supported, unlike CSS field-sizing which
        // only landed in Chrome 123. min(8) keeps tiny names from
        // collapsing to a sliver, +1 leaves room for the next keystroke.
        size={Math.max(draft.length + 1, 8)}
        className={cn(
          // Focus ring matches the atomic Input compact family (3px ring +
          // border-ring + ring/50). The rest stays minimal so the inline
          // edit reads as "renaming in place" rather than "form field".
          '-mx-1 rounded border border-input bg-background px-1 text-xs font-medium text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={beginEdit}
      disabled={disabled}
      className={cn(
        'group flex min-w-0 items-center gap-1 -mx-1 rounded px-1 text-xs font-medium text-foreground transition-colors',
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
  );
}
