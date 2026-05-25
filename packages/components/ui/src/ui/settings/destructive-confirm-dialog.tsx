import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour/alert-dialog';
import { RiAlertFill } from '@usertour/icons';
import { LoadingButton } from '../loading-button';

export interface DestructiveConfirmDialogProps {
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
   * Localised confirm-button label. Convention: action verb + object,
   * matching the title's action ('Delete API key', 'Remove member',
   * 'Transfer ownership', 'End session'). Not a generic 'OK' or
   * standalone 'Delete' — a destructive button label should stand on
   * its own for screen readers and for users who scan the button
   * without re-reading the title. Defaults to 'Confirm' as a non-
   * translated last-resort fallback; every real consumer passes a
   * t() string.
   */
  confirmLabel?: ReactNode;
  /**
   * Localised cancel-button label. Defaults to 'Cancel' as a non-translated
   * last-resort fallback.
   */
  cancelLabel?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Runs on confirm-button click. Throw / reject to surface an error
   * toast at the call site; the primitive does not toast on its own.
   */
  onConfirm: () => void | Promise<void>;
  /** Reflected on the confirm button as spinner + disabled. */
  loading?: boolean;
}

/**
 * The destructive confirmation shell used by every "delete X / remove X /
 * transfer X / end X" flow across the app. Owns chrome (warning badge +
 * row header layout + `max-w-xl` width + `<AlertDialog>` strict dismiss +
 * destructive `LoadingButton`); does not own copy or mutation logic —
 * those flow in via props so the consumer's i18n layer stays the source
 * of truth.
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
 *   pattern (Linear, Notion, GitHub, the two competitor screenshots
 *   referenced in ADR 0003).
 * - **Cancel button** is always the plain word — `'Cancel'` / `'取消'`.
 *   Never `'No, do nothing'`, `'Keep X'`, etc. The destructive button
 *   already carries enough emphasis; pairing a styled red button with a
 *   neutral 'Cancel' is the established balance.
 * - **i18n placement**: settings reuses one shared key tree
 *   `settings.common.deleteConfirm.{title, description, confirm}` with
 *   `{{resource}}` interpolation drawn from each section's
 *   `deleteResource` key. Non-settings consumers (sessions, users,
 *   companies, contents) define their own per-section keys because the
 *   description copy is domain-specific (multi-entity counts, segment
 *   re-add hints, content-type interpolation, etc.).
 *
 * Canonical wiring, from `attribute-delete-dialog.tsx`:
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
 *       onConfirm={handleDelete}
 *       loading={isDeleting}
 *     />
 *
 * Do not reach for raw `<Dialog>` or `<AlertDialog>` for a destructive
 * confirm. If you find this primitive's shape doesn't fit (multi-step
 * danger flow, type-the-name-to-confirm, inline form field), write a
 * sibling primitive rather than forking the chrome — see
 * `docs/adr/0003-destructive-confirm-primitive.md` for the rules around
 * when divergence is and isn't appropriate.
 */
export const DestructiveConfirmDialog = ({
  title,
  description,
  confirmLabel,
  cancelLabel,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: DestructiveConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* Widen past AlertDialog's default max-w-lg (512px). The icon
          column eats ~56px on the left, so the default leaves a single
          short sentence wrapping mid-word ("cannot be / undone."). 576px
          fits the common case on one line; the global
          `[overflow-wrap:anywhere]` still catches extreme names. */}
      <AlertDialogContent className="max-w-xl">
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
          <AlertDialogCancel disabled={loading}>{cancelLabel ?? 'Cancel'}</AlertDialogCancel>
          <LoadingButton variant="destructive" onClick={onConfirm} loading={loading}>
            {confirmLabel ?? 'Confirm'}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

DestructiveConfirmDialog.displayName = 'DestructiveConfirmDialog';
