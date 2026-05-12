import { RiCloseLine } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import type { RulesCondition } from '@usertour/types';
import isEqual from 'fast-deep-equal';
import { useEffect, useRef, useState } from 'react';
import { useActionsContext, useActionsT } from './actions-context';
import { ActionEditor } from './action-editor';
import { getActionSchema } from './registry';
import type { ValidateContext } from './schema-types';
import {
  ActionErrorTooltip,
  ActionErrorTooltipAnchor,
  ActionErrorTooltipContent,
  ActionPopover,
  ActionPopoverContent,
  ActionPopoverTrigger,
} from './ui';

interface Props {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onRemove: () => void;
  // When true, the row opens its popover once on mount. Used by ActionList
  // after appending a fresh action so the user lands directly in the editor
  // without an extra click.
  autoOpen?: boolean;
  onAutoOpened?: () => void;
}

// Outer chip: holds the trigger and the close button as one rounded unit
// joined by a 1px divider — the close belongs visually to the chip.
const CHIP_OUTER =
  'group/action inline-flex items-stretch overflow-hidden rounded-lg border border-input/60 bg-background text-sm shadow-sm transition-colors hover:border-input';

const CHIP_INVALID = 'border-destructive/70 hover:border-destructive';

// One action row. Mirrors ConditionRow but without 'group' branching —
// actions don't nest. Edit cadence is identical: while the popover is open,
// edits flow into a local draft; the parent's onChange fires once on close
// (only when the draft differs).
export function ActionRow({ condition, onChange, onRemove, autoOpen, onAutoOpened }: Props) {
  const ctx = useActionsContext();
  const t = useActionsT();
  const { disabled } = ctx;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RulesCondition>(condition);
  // Ref-mirror of `draft` so handleOpenChange always reads the freshest
  // value. Necessary because some schema editors (e.g., step-goto) call
  // onChange(newValue) and immediately follow it with onClose() — React
  // state setters are async, so handleOpenChange would otherwise close
  // out a stale draft and validate against the pre-edit value, surfacing
  // a spurious red chip on the first interaction.
  const draftRef = useRef<RulesCondition>(condition);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const schema = getActionSchema(condition.type);

  const updateDraft = (next: RulesCondition) => {
    draftRef.current = next;
    setDraft(next);
  };

  useEffect(() => {
    if (autoOpen && !disabled) {
      setOpen(true);
      onAutoOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  // Sync the draft when the committed condition changes externally. Skipped
  // while the popover is open so partial edits survive a re-render of the
  // parent — only ever re-sync from the closed state.
  useEffect(() => {
    if (!open) {
      draftRef.current = condition;
      setDraft(condition);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition]);

  const validateContext: ValidateContext = {
    attributes: ctx.attributes,
    segments: ctx.segments,
    contents: ctx.contents,
    currentContent: ctx.currentContent,
    currentVersion: ctx.currentVersion,
    currentStep: ctx.currentStep,
  };

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    if (next) {
      setErrorKey(null);
      setOpen(true);
      return;
    }
    setOpen(false);
    // Closing — normalize, validate, propagate either way so the save-time
    // gate catches invalid drafts via the committed tree (matches the
    // Conditions behavior; without it, clearing a value would leave the
    // chip red but the parent still holding the old value). Reads
    // `draftRef.current` instead of `draft` so a synchronous
    // onChange-then-onClose sequence (e.g., picking a step in step-goto)
    // sees the new value before React has applied the setState.
    const current = draftRef.current;
    const finalized = schema?.normalize?.(current) ?? current;
    const result = schema?.validate?.(finalized, validateContext);
    setErrorKey(result?.key ?? null);
    if (!isEqual(finalized, condition)) {
      onChange(finalized);
    }
  };

  // Unknown type — render a removable placeholder so legacy data using a
  // since-removed action type stays visible / cleanable.
  if (!schema) {
    return (
      <div className="inline-flex w-full items-stretch overflow-hidden rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
        <span className="min-w-0 flex-1 truncate px-3 py-1.5">
          {t('actions.errors.unknownAction', { type: condition.type })}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('actions.actions.removeAction')}
            className="flex w-7 shrink-0 items-center justify-center border-l border-input/60 text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground focus-visible:outline-none"
          >
            <RiCloseLine className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  const { Summary } = schema;

  // Schemas without an Editor (the four dismiss variants) render as static
  // chips — no popover trigger, no auto-open on add.
  if (!schema.Editor) {
    return (
      <div className={cn(CHIP_OUTER, 'w-full')}>
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left">
          <Summary condition={condition} />
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('actions.actions.removeAction')}
            className="flex w-7 shrink-0 items-center justify-center border-l border-input/60 text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground focus-visible:outline-none group-hover/action:text-muted-foreground"
          >
            <RiCloseLine className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  const showError = Boolean(errorKey) && !open;
  const visibleCondition = open ? draft : condition;

  // Editor Popover is nested INSIDE the error Popover so ActionPopover wins
  // as the nearest Popover provider for trigger/content — same wiring as
  // ConditionRow. Reverse nesting would bind the editor trigger to the
  // error popover and clicking the chip wouldn't open anything.
  return (
    <ActionErrorTooltip open={showError}>
      <ActionErrorTooltipAnchor asChild>
        <div className={cn(CHIP_OUTER, errorKey ? CHIP_INVALID : '', 'w-full')}>
          <ActionPopover open={open} onOpenChange={handleOpenChange}>
            <ActionPopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Summary condition={visibleCondition} />
              </button>
            </ActionPopoverTrigger>
            <ActionPopoverContent
              align="start"
              sideOffset={6}
              className={schema.editorWidthClassName ?? 'w-[320px]'}
            >
              <ActionEditor
                schema={schema}
                condition={draft}
                onChange={updateDraft}
                onClose={() => handleOpenChange(false)}
              />
            </ActionPopoverContent>
          </ActionPopover>
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={t('actions.actions.removeAction')}
              className="flex w-7 shrink-0 items-center justify-center border-l border-input/60 text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground focus-visible:outline-none group-hover/action:text-muted-foreground"
            >
              <RiCloseLine className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </ActionErrorTooltipAnchor>
      {errorKey && (
        <ActionErrorTooltipContent side="right" sideOffset={8}>
          {t(errorKey)}
        </ActionErrorTooltipContent>
      )}
    </ActionErrorTooltip>
  );
}
