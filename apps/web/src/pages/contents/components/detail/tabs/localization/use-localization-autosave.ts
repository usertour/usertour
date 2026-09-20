import type { LocalizationTranslationUnit } from '@usertour/helpers';
import { useUpdateVersionLocalizationMutation } from '@usertour/hooks';
import { useToast } from '@usertour/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  advanceTranslationBaseline,
  diffTranslationUnits,
  toTranslationBaseline,
} from './translation-unit-changes';

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
  contentId: string;
  localeCode: string;
  /**
   * The working copy as translation units, read at flush time. What it holds
   * at mount is what the server stores, and becomes the first baseline.
   */
  readUnits: () => LocalizationTranslationUnit[];
}

/**
 * Debounced unit-level save. The editor only says "something changed"; a flush
 * sends the units that differ from the baseline — what the server is known to
 * hold — and the server merges them into the stored translation, so the
 * payload, the source snapshot and embed resolution are built in one place for
 * every surface. The baseline advances only on success: a failed save leaves
 * its units different, and the next flush carries them again. One request is
 * in flight at a time, so saves land in the order they were made. Flushes 800ms
 * after the last edit, and on unmount so navigating away can't drop an edit.
 */
export const useLocalizationAutosave = (options: LocalizationAutosaveOptions) => {
  const { resolveTargetVersionId, contentId, localeCode, readUnits } = options;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { invoke: updateVersionLocalization } = useUpdateVersionLocalizationMutation();
  const [saveState, setSaveState] = useState<LocalizationSaveState>('idle');

  const readUnitsRef = useRef(readUnits);
  readUnitsRef.current = readUnits;
  const baselineRef = useRef<Map<string, string> | null>(null);
  if (baselineRef.current === null) {
    baselineRef.current = toTranslationBaseline(readUnits());
  }
  const inFlightRef = useRef(false);
  const flushAgainRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(async () => {
    if (inFlightRef.current) {
      flushAgainRef.current = true;
      return;
    }
    const baseline = baselineRef.current ?? new Map<string, string>();
    const changes = diffTranslationUnits(baseline, readUnitsRef.current());
    if (changes.length === 0) {
      return;
    }
    inFlightRef.current = true;
    setSaveState('saving');
    try {
      const versionId = await resolveTargetVersionId();
      const saved = await updateVersionLocalization({
        contentId,
        versionId,
        code: localeCode,
        translations: changes,
      });
      if (!saved) {
        throw new Error('Translation save returned no row');
      }
      baselineRef.current = advanceTranslationBaseline(baseline, changes);
    } catch (_) {
      toast({
        variant: 'destructive',
        title: t('contents.localization.toast.saveFailure'),
      });
    } finally {
      inFlightRef.current = false;
      setSaveState('idle');
      if (flushAgainRef.current) {
        flushAgainRef.current = false;
        void flushSaveRef.current();
      }
    }
  }, [resolveTargetVersionId, contentId, localeCode, updateVersionLocalization, toast, t]);

  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushSaveRef.current();
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Nothing to send resolves to a no-op, so an unconditional flush is safe.
      void flushSaveRef.current();
    };
  }, []);

  return { saveState, scheduleSave };
};
