import { useCallback, useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour/alert-dialog';
import { getErrorMessage } from '@usertour/helpers';
import { RiAlertFill } from '@usertour/icons';
import { useToast } from '@usertour/use-toast';
import { LoadingButton } from '../loading-button';

interface ChromeProps {
  /**
   * Localised dialog title. Use the action-named pattern shared across
   * consumers: 'Delete {{resource}}', 'Remove member', 'Transfer ownership'.
   * Avoid generic ('Are you sure?') or question-shaped titles — the
   * description carries the question.
   */
  title: ReactNode;
  /**
   * Localised description body. Convention: a one-sentence question with
   * the entity name (or other identifying value) bolded inline via
   * `<Trans>` + `{ strong: <strong className="font-bold text-foreground" /> }`,
   * followed by the consequence ("This action cannot be undone." / "You'll
   * lose owner privileges and won't be able to undo this.").
   */
  description: ReactNode;
  /**
   * Localised confirm-button label. Required — the primitive stays
   * i18n-agnostic. Convention: action verb + object, matching the
   * title's action ('Delete API key', 'Remove member', 'Transfer
   * ownership', 'End session').
   */
  confirmLabel: ReactNode;
  /**
   * Localised cancel-button label. Required — same reasoning.
   */
  cancelLabel: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ManagedProps {
  /**
   * The mutation to run on confirm. Resolve to `true` on success, `false`
   * on recognised soft-failure (server returned but did not confirm).
   * Throwing surfaces the error message via destructive toast. The
   * primitive owns the loading spinner, the success-on-close, and the
   * toast triage.
   *
   * Mutually exclusive with `onConfirm` — pick one.
   */
  invoke: () => Promise<boolean>;
  /**
   * Success-toast title (already i18n'd). Omit to stay silent on
   * success — appropriate when the surrounding list refresh already
   * communicates the outcome (e.g. the member-* dialogs).
   */
  successToast?: string;
  /**
   * Destructive-toast title shown when `invoke` resolves `false`.
   * Required — soft-failure without feedback is what produced the
   * "spinner stops, dialog stays, nothing happens" UX bug this mode is
   * here to prevent.
   */
  failureToast: string;
  /**
   * Called once the action settles, with whether it succeeded. Use for
   * parent refetch or row state cleanup — fires on both the success and
   * soft-failure branches and after the throw branch.
   */
  onSettled?: (success: boolean) => void;
  onConfirm?: never;
  loading?: never;
}

interface UnmanagedProps {
  /**
   * Runs on confirm-button click. Throw / reject to surface an error
   * toast at the call site; the primitive does not toast on its own in
   * this mode. Use the managed-mode props (`invoke` + `failureToast`)
   * instead unless your action shape doesn't fit `Promise<boolean>`.
   */
  onConfirm: () => void | Promise<void>;
  /** Reflected on the confirm button as spinner + disabled. */
  loading?: boolean;
  invoke?: never;
  successToast?: never;
  failureToast?: never;
  onSettled?: never;
}

export type DestructiveConfirmDialogProps = ChromeProps & (ManagedProps | UnmanagedProps);

/**
 * The destructive confirmation shell used by every "delete X / remove X /
 * transfer X / end X" flow across the app. Owns chrome (warning badge +
 * row header layout + `max-w-xl` width + `<AlertDialog>` strict dismiss +
 * destructive `LoadingButton`).
 *
 * Two modes:
 *
 * **Managed** (preferred) — pass `invoke` + `failureToast` (+ optional
 * `successToast` / `onSettled`). The primitive runs the mutation, shows
 * the appropriate toast for each branch (success / soft-failure / throw),
 * closes itself on success, and threads `loading` through the confirm
 * button. Use this for any `Promise<boolean>`-returning mutation.
 *
 *     <DestructiveConfirmDialog
 *       title={t('settings.common.deleteConfirm.title', {
 *         resource: t('settings.attributes.deleteResource'),
 *       })}
 *       description={
 *         <Trans
 *           i18nKey="settings.common.deleteConfirm.description"
 *           values={{ name: data.displayName }}
 *           components={{ strong: <strong className="font-bold text-foreground" /> }}
 *         />
 *       }
 *       confirmLabel={t('settings.common.deleteConfirm.confirm', {
 *         resource: t('settings.attributes.deleteResource'),
 *       })}
 *       cancelLabel={t('settings.common.cancel')}
 *       open={open}
 *       onOpenChange={onOpenChange}
 *       invoke={() => deleteAttribute(data.id)}
 *       successToast={t('settings.attributes.deleteSuccess')}
 *       failureToast={t('settings.attributes.deleteFailure')}
 *       onSettled={onSubmit}
 *     />
 *
 * **Unmanaged** (legacy) — pass `onConfirm` (+ optional `loading`).
 * Useful when the action shape doesn't reduce to `Promise<boolean>` (e.g.
 * `{ success, count }` from a bulk delete, or non-mutation flows like
 * "navigate after confirm").
 *
 * Copy conventions (settled across all current consumers — see ADR 0003):
 *
 * - **Title** is action-named with the object: `'Delete API key'`,
 *   `'Remove member'`, `'End session'`, `'Transfer ownership'`. Never
 *   `'Are you absolutely sure?'` or `'Confirm'` — the question lives in
 *   the description.
 * - **Description** is one sentence: the action question with the
 *   entity name bolded inline (when there's a single entity) plus the
 *   consequence. Bold the name via `<Trans>` + `{ strong: <strong
 *   className="font-bold text-foreground" /> }`, not by writing literal
 *   markup in the i18n string.
 * - **Confirm button** mirrors the title — `'Delete API key'`, not
 *   `'Delete'` alone. This keeps the button informative on its own (for
 *   screen readers and quick scans) and matches the modern SaaS
 *   pattern (Linear, Notion, GitHub).
 * - **Cancel button** is always the plain word — `'Cancel'` / `'取消'`.
 * - **i18n placement**: settings reuses one shared key tree
 *   `settings.common.deleteConfirm.{title, description, confirm}` with
 *   `{{resource}}` interpolation drawn from each section's
 *   `deleteResource` key. Non-settings consumers (sessions, users,
 *   companies, contents) define their own per-section keys because the
 *   description copy is domain-specific.
 *
 * Do not reach for raw `<Dialog>` or `<AlertDialog>` for a destructive
 * confirm. If you find this primitive's shape doesn't fit (multi-step
 * danger flow, type-the-name-to-confirm, inline form field), write a
 * sibling primitive rather than forking the chrome — see
 * `docs/adr/0003-destructive-confirm-primitive.md` for the rules around
 * when divergence is and isn't appropriate.
 */
export const DestructiveConfirmDialog = (props: DestructiveConfirmDialogProps) => {
  const { title, description, confirmLabel, cancelLabel, open, onOpenChange } = props;
  const { toast } = useToast();
  const [managedLoading, setManagedLoading] = useState(false);

  // Decompose the managed-mode fields up-front so `runManaged`'s
  // dependency array can list concrete identities. Passing the whole
  // `props` object made the memo effectively dead (new ref each render)
  // and was a footgun — anyone running exhaustive-deps and "fixing" the
  // list to `[props.invoke, props.failureToast, ...]` would have
  // introduced a real stale-closure bug across the `await` window.
  const isManaged = 'invoke' in props && props.invoke !== undefined;
  const managed = isManaged ? (props as ManagedProps & ChromeProps) : null;
  const invoke = managed?.invoke;
  const successToast = managed?.successToast;
  const failureToast = managed?.failureToast;
  const onSettled = managed?.onSettled;

  // Managed-mode action loop — primitive owns success / failure / throw triage.
  const runManaged = useCallback(async () => {
    if (!invoke || failureToast === undefined) {
      return;
    }
    setManagedLoading(true);
    try {
      const success = await invoke();
      if (success) {
        if (successToast !== undefined) {
          toast({ variant: 'success', title: successToast });
        }
        onSettled?.(true);
        onOpenChange(false);
      } else {
        // Soft-failure: the mutation resolved but didn't confirm. Leave
        // the dialog open so the user gets feedback + can retry instead
        // of staring at a half-stopped spinner.
        toast({ variant: 'destructive', title: failureToast });
        onSettled?.(false);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
      onSettled?.(false);
    } finally {
      setManagedLoading(false);
    }
  }, [invoke, successToast, failureToast, onSettled, onOpenChange, toast]);

  const handleConfirm = isManaged ? runManaged : (props as UnmanagedProps).onConfirm;
  const effectiveLoading = isManaged ? managedLoading : (props as UnmanagedProps).loading;

  // Block dismissal (Esc / external `onOpenChange(false)`) while a
  // managed mutation is in-flight. The Cancel button is already
  // `disabled={effectiveLoading}`, but AlertDialog's default Escape
  // handler routes around it — unmounting mid-await would race the
  // pending `invoke()` against the toast/onSettled callbacks and
  // surprise the user with feedback for an action they thought they
  // cancelled. The mutation itself can't be aborted, so the right
  // behaviour is to lock the chrome until it settles.
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && effectiveLoading) {
          return;
        }
        onOpenChange(next);
      }}
    >
      {/* Widen past AlertDialog's default max-w-lg (512px). The icon
          column eats ~56px on the left, so the default leaves a single
          short sentence wrapping mid-word ("cannot be / undone."). 576px
          fits the common case on one line; the global
          `[overflow-wrap:anywhere]` still catches extreme names. */}
      <AlertDialogContent
        className="max-w-xl"
        onEscapeKeyDown={(event) => {
          if (effectiveLoading) {
            event.preventDefault();
          }
        }}
      >
        {/* Header overrides AlertDialogHeader's default column layout to
            row-align the warning badge with the title+description column.
            shadcn's `cn()` uses tailwind-merge so the override wins. */}
        <AlertDialogHeader className="flex-row gap-4 space-y-0 text-left sm:text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <RiAlertFill className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={effectiveLoading}>{cancelLabel}</AlertDialogCancel>
          <LoadingButton variant="destructive" onClick={handleConfirm} loading={effectiveLoading}>
            {confirmLabel}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

DestructiveConfirmDialog.displayName = 'DestructiveConfirmDialog';
