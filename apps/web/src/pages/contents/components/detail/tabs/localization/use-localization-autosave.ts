import { useUpsertVersionLocalizationMutation } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// No 'saved' state on purpose: a resting "Saved" label is permanent noise.
// The editor surfaces only the in-flight moment; failures toast, and the
// unmount flush keeps navigation from dropping an edit.
export type LocalizationSaveState = 'idle' | 'saving';

export interface LocalizationAutosaveOptions {
  /**
   * The version this flush writes to — resolved at flush time (not captured
   * at mount) so a publish that happened after mount forks a draft before
   * the write lands (see useLocalizationSaveTarget).
   */
  resolveTargetVersionId: () => Promise<string>;
  localizationId: string;
  enabled: boolean;
  /**
   * Source snapshot stored alongside the translation — what future sessions
   * diff to flag "source changed". Read at flush time so it always reflects
   * the latest source.
   */
  buildBackup: () => unknown;
}

/**
 * Debounced upsert of a localization payload. Keeps at most one pending
 * payload, flushes it 800ms after the last edit, and flushes on unmount so
 * navigating away can't drop an edit.
 */
export const useLocalizationAutosave = (options: LocalizationAutosaveOptions) => {
  const { resolveTargetVersionId, localizationId, enabled, buildBackup } = options;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { invoke: upsertVersionLocalization } = useUpsertVersionLocalizationMutation();
  const [saveState, setSaveState] = useState<LocalizationSaveState>('idle');

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const buildBackupRef = useRef(buildBackup);
  buildBackupRef.current = buildBackup;
  const pendingRef = useRef<unknown>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(async () => {
    const pendingLocalized = pendingRef.current;
    if (!pendingLocalized) {
      return;
    }
    pendingRef.current = null;
    setSaveState('saving');
    try {
      const versionId = await resolveTargetVersionId();
      await upsertVersionLocalization({
        versionId,
        localizationId,
        localized: pendingLocalized,
        backup: buildBackupRef.current(),
        enabled: enabledRef.current,
      });
      setSaveState('idle');
    } catch (_) {
      setSaveState('idle');
      toast({
        variant: 'destructive',
        title: t('contents.localization.toast.saveFailure'),
      });
    }
  }, [resolveTargetVersionId, localizationId, upsertVersionLocalization, toast, t]);

  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  const scheduleSave = useCallback((nextLocalized: unknown) => {
    pendingRef.current = nextLocalized;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void flushSaveRef.current();
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (pendingRef.current) {
        void flushSaveRef.current();
      }
    };
  }, []);

  return { saveState, scheduleSave };
};
