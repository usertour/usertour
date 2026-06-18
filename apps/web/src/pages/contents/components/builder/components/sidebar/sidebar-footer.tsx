import { Button } from '@usertour/ui';
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiLogoutBoxLine,
  SpinnerIcon,
} from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import { useSaveState } from '@/pages/contents/components/builder/core';
import type { SaveState } from '@/pages/contents/components/builder/core/builder-store';

export interface SidebarFooterProps {
  // Save-and-exit handler from `useSidebarSave()`: persists the draft, then
  // navigates out of the builder ONLY if the save succeeded. So on a failed /
  // conflicted save, pressing Done re-tries and keeps the user here rather than
  // leaving with unpersisted edits — no extra confirm dialog needed.
  onSave: () => Promise<void>;
}

// Auto-save status line. The builder persists on a debounce (see useAutoSave),
// so this is a PASSIVE indicator of the save FSM, never a "press to save"
// control. The six FSM states collapse into three visual groups: a quiet grey
// Saved/Unsaved for the normal edit loop, a spinner while saving, and a red
// warning (with Retry) only when a save actually fails. Keeping the resting
// state muted means the footer only draws the eye when something is wrong —
// the previous footer showed a green "Saved" for dirty/error/conflict alike,
// i.e. claimed "saved" while a save was pending or had failed.
const SaveStatusIndicator = (props: { saveState: SaveState; onRetry: () => void }) => {
  const { saveState, onRetry } = props;
  const { t } = useTranslation();

  if (saveState.status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <SpinnerIcon className="size-3.5 animate-spin" />
        {t('contentBuilder.common.saving')}
      </span>
    );
  }

  if (saveState.status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <RiErrorWarningLine className="size-3.5" />
        {t('contentBuilder.common.saveFailed')}
        <button
          type="button"
          onClick={onRetry}
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          {t('contentBuilder.common.retry')}
        </button>
      </span>
    );
  }

  if (saveState.status === 'conflict') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <RiErrorWarningLine className="size-3.5" />
        {t('contentBuilder.common.outOfDate')}
      </span>
    );
  }

  // 'dirty' — edited but not yet persisted: either the debounce window (usually
  // momentary) or an auto-save validator veto holding it here. A quiet dot, not
  // a warning — it's a normal transient state, but honest about being unsaved.
  if (saveState.status === 'dirty') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground/50" />
        {t('contentBuilder.common.unsaved')}
      </span>
    );
  }

  // 'saved' / 'idle' — the resting state. Muted, and a LINE check (not a filled
  // disc): "saved" is the default the vast majority of the time and shouldn't
  // out-weigh the actual action button sitting next to it.
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <RiCheckboxCircleLine className="size-3.5" />
      {t('contentBuilder.common.saved')}
    </span>
  );
};

export const SidebarFooter = (props: SidebarFooterProps) => {
  const { onSave } = props;
  const { t } = useTranslation();
  const saveState = useSaveState();

  return (
    <div className="flex w-full items-center gap-3">
      <SaveStatusIndicator saveState={saveState} onRetry={onSave} />
      <Button
        variant="ghost"
        className="ml-auto h-8 gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={onSave}
        disabled={saveState.status === 'saving'}
      >
        <RiLogoutBoxLine className="size-4" />
        {t('contentBuilder.common.exit')}
      </Button>
    </div>
  );
};
SidebarFooter.displayName = 'SidebarFooter';
