import { RiCloseLine } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import type { RulesCondition } from '@usertour/types';
import isEqual from 'fast-deep-equal';
import { useEffect, useState } from 'react';
import { useConditionsContext, useConditionsT } from './conditions-context';
import { ConditionEditor } from './condition-editor';
import { ConditionList } from './condition-list';
import { getConditionSchema } from './registry';
import type { ValidateContext } from './schema-types';
import { Button } from '@usertour/button';
import {
  ConditionErrorTooltip,
  ConditionErrorTooltipAnchor,
  ConditionErrorTooltipContent,
  ConditionPopover,
  ConditionPopoverContent,
  ConditionPopoverTrigger,
} from './ui';

interface Props {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onRemove: () => void;
  // When true, the row opens its popover on mount once. Used by ConditionList
  // after adding a new condition so the user lands directly in the editor
  // without an extra click.
  autoOpen?: boolean;
  onAutoOpened?: () => void;
  // filterItems propagated from the parent ConditionList. Threaded into
  // nested groups so a group inside a constrained scope (e.g. an event's
  // where-section limited to ['event-attr', 'group']) keeps the same
  // restriction at every depth.
  filterItems?: string[];
}

// Outer chip: holds the trigger and the close button as one rounded unit
// joined by a 1px divider, so the close belongs visually to its condition
// instead of floating beside it.
const CHIP_OUTER =
  'group/condition inline-flex items-stretch overflow-hidden rounded-lg border border-input/60 bg-background text-sm shadow-sm transition-colors hover:border-input';

// Red ring around the chip when validation failed on close — gives a static
// visual cue that complements the popping error tooltip so the row stays
// flagged even after the tooltip auto-dismisses.
const CHIP_INVALID = 'border-destructive/70 hover:border-destructive';

// One condition row. For 'group' types renders a recursive ConditionList
// inline (no popover). For all other registered types renders a summary
// button that opens the type's Editor in a popover.
//
// Edit cadence mirrors v1 Rules: while the editor popover is open, edits go
// to a local `draft` and only the chip Summary reflects them; the parent's
// onChange fires once on popover close (and only when the draft actually
// differs from the committed condition). This keeps consumers from having
// to debounce or dedup keystroke-level updates.
export function ConditionRow({
  condition,
  onChange,
  onRemove,
  autoOpen,
  onAutoOpened,
  filterItems,
}: Props) {
  const ctx = useConditionsContext();
  const t = useConditionsT();
  const { disabled, isHorizontal } = ctx;
  const [open, setOpen] = useState(false);
  // Draft is the in-flight edit. While the editor is open, the schema's
  // Editor writes here instead of bubbling to the parent on each keystroke.
  const [draft, setDraft] = useState<RulesCondition>(condition);
  // i18n key of the validation error currently flagged on this row, or null
  // when valid / unchecked. Recomputed each time the editor closes.
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const schema = getConditionSchema(condition.type);

  useEffect(() => {
    if (autoOpen && !disabled) {
      setOpen(true);
      onAutoOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  // Sync the draft when the committed condition changes externally (parent
  // overwriting state, list reordering, logic re-stamp). Intentionally only
  // depends on `condition` — we don't want to re-sync when the popover toggles
  // because that would wipe partial edits on a close-with-error (the draft
  // should survive until the user fixes the error or removes the row).
  useEffect(() => {
    if (!open) setDraft(condition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition]);

  const validateContext: ValidateContext = {
    attributes: ctx.attributes,
    segments: ctx.segments,
    contents: ctx.contents,
    events: ctx.events,
  };

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    if (next) {
      // Open: hide any prior error so editing isn't chased by red. The draft
      // already tracks the committed condition via useEffect.
      setErrorKey(null);
      setOpen(true);
      return;
    }
    setOpen(false);
    // Closing — normalize first (strips in-flight UI artifacts like empty
    // list rows) so what we validate / persist matches what the runtime
    // will see. Then validate and propagate either way: invalid edits
    // also commit so the save-time gate catches them via validateConditions
    // on the committed tree. Without this, a user clearing a value would
    // see the chip turn red but the parent still holding the old valid
    // value — Save would silently succeed and persist the old data,
    // discarding the user's "delete this" intent. Now the gate blocks
    // save until the user either fixes the value or backs out.
    const finalized = schema?.normalize?.(draft) ?? draft;
    const result = schema?.validate?.(finalized, validateContext);
    setErrorKey(result?.key ?? null);
    if (!isEqual(finalized, condition)) {
      onChange(finalized);
    }
  };

  // In horizontal layout each chip sizes to its content; in vertical it
  // stretches to fill the surrounding container.
  const widthClass = isHorizontal ? 'max-w-full' : 'w-full';

  // Group is structurally different — its UI is a nested list, not a popover.
  if (condition.type === 'group') {
    return (
      // pr-8 leaves a column for the absolute-positioned remove button at
      // the top-right; without it a vertical w-full chip on row 1 (and
      // its own close X) sits underneath the group's remove button. v1
      // rules-group.tsx made the same allowance with pr-6.
      <div
        className={cn(
          'group/condition relative rounded-lg border border-input/60 bg-background/40 p-2 pr-8 shadow-sm',
          isHorizontal ? 'inline-block max-w-full' : 'w-full',
        )}
      >
        <ConditionList
          conditions={condition.conditions ?? []}
          onChange={(nextNested) => onChange({ ...condition, conditions: nextNested })}
          filterItems={filterItems}
          isNested
        />
        {!disabled && (
          <Button
            type="button"
            variant="compact-ghost"
            size="compact-icon-sm"
            aria-label={t('conditions.actions.removeGroup')}
            onClick={onRemove}
            className="absolute right-1 top-1 opacity-0 transition-opacity group-hover/condition:opacity-100 focus-visible:opacity-100"
          >
            <RiCloseLine className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // Unknown type — render a placeholder so the user can still see and remove
  // it. Important for forward compatibility with old data that used a type
  // we've since removed.
  if (!schema) {
    return (
      <div
        className={cn(
          'inline-flex items-stretch overflow-hidden rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground',
          widthClass,
        )}
      >
        <span className="min-w-0 flex-1 truncate px-3 py-1.5">
          {t('conditions.errors.unknownCondition', { type: condition.type })}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('conditions.actions.removeCondition')}
            className="flex w-7 shrink-0 items-center justify-center border-l border-input/60 text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground focus-visible:outline-none"
          >
            <RiCloseLine className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  const { Summary } = schema;

  // Schemas with no Editor (e.g., task-is-clicked) render as a static chip
  // — no popover trigger, no auto-open on add. Mirrors v1
  // RulesTaskIsClicked's read-only row.
  if (!schema.Editor) {
    return (
      <div className={cn(CHIP_OUTER, widthClass)}>
        <div
          className={cn(
            'flex min-w-0 items-center gap-2 px-3 py-1.5 text-left',
            isHorizontal ? '' : 'flex-1',
          )}
        >
          <Summary condition={condition} />
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('conditions.actions.removeCondition')}
            className="flex w-7 shrink-0 items-center justify-center border-l border-input/60 text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground focus-visible:outline-none group-hover/condition:text-muted-foreground"
          >
            <RiCloseLine className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Surface the inline error tooltip whenever a key is set AND the editor is
  // closed — opening the editor temporarily hides it.
  const showError = Boolean(errorKey) && !open;
  // Chip Summary follows the draft so users see live changes while editing,
  // then settles back to the committed condition on close (via the
  // useEffect above when draft = condition).
  const visibleCondition = open ? draft : condition;

  // Nest the editor Popover INSIDE the error Popover (mirrors v1
  // RulesUserAttribute: <RulesError><RulesErrorAnchor><RulesPopover>...).
  // Both popovers come from the same Radix Popover module and share a
  // React context — having ErrorTooltip outside means ConditionPopover
  // gets to be the nearest provider for ConditionPopoverTrigger /
  // ConditionPopoverContent, while ErrorTooltipAnchor stays bound to the
  // outer ErrorTooltip. Putting them the other way round bound the editor
  // trigger to the error popover and clicking the chip wouldn't open
  // anything.
  return (
    <ConditionErrorTooltip open={showError}>
      <ConditionErrorTooltipAnchor asChild>
        <div className={cn(CHIP_OUTER, errorKey ? CHIP_INVALID : '', widthClass)}>
          <ConditionPopover open={open} onOpenChange={handleOpenChange}>
            <ConditionPopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  'flex min-w-0 items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
                  isHorizontal ? '' : 'flex-1',
                )}
              >
                <Summary condition={visibleCondition} />
              </button>
            </ConditionPopoverTrigger>
            <ConditionPopoverContent
              align="start"
              sideOffset={6}
              className={schema.editorWidthClassName ?? 'w-[300px]'}
            >
              <ConditionEditor
                schema={schema}
                condition={draft}
                onChange={setDraft}
                onClose={() => handleOpenChange(false)}
              />
            </ConditionPopoverContent>
          </ConditionPopover>
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove condition"
              className="flex w-7 shrink-0 items-center justify-center border-l border-input/60 text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground focus-visible:outline-none group-hover/condition:text-muted-foreground"
            >
              <RiCloseLine className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </ConditionErrorTooltipAnchor>
      {errorKey && (
        <ConditionErrorTooltipContent side="right" sideOffset={8}>
          {t(errorKey)}
        </ConditionErrorTooltipContent>
      )}
    </ConditionErrorTooltip>
  );
}
