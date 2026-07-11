import { useAppContext } from '@/contexts/app-context';
import { useSubscription } from '@/hooks/use-subscription';
import { MACHINE_TRANSLATION_UNITS_PER_BATCH } from '@usertour/constants';
import { getErrorMessage } from '@usertour/helpers';
import type { LocalizationTranslationUnit } from '@usertour/helpers';
import { useTranslateLocalizationUnitsMutation } from '@usertour/hooks';
import { RiSparkling2Line, SpinnerIcon } from '@usertour/icons';
import { PlanType } from '@usertour/types';
import { Button, Tooltip, TooltipContent, TooltipTrigger, useToast } from '@usertour/ui';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface MachineTranslationButtonProps {
  versionId: string;
  localizationId: string;
  /** Follows the editor lock — translating mutates the working translation. */
  disabled: boolean;
  /** Current units; only the untranslated ones are sent for translation. */
  buildUnits: () => LocalizationTranslationUnit[];
  onApply: (translations: ReadonlyMap<string, string>) => void;
}

/**
 * Shared machine-translation gating: configured = the instance has a
 * translation key (capability flag), lockedByPlan = cloud free plan. The
 * header button and the per-row translate buttons follow the same gate.
 */
export const useMachineTranslationGate = () => {
  const { globalConfig } = useAppContext();
  const { planType } = useSubscription();
  const configured = Boolean(globalConfig?.machineTranslationEnabled);
  const lockedByPlan = configured && !globalConfig?.isSelfHostedMode && planType === PlanType.HOBBY;
  return { configured, lockedByPlan };
};

export interface UnitTranslateTextInput {
  versionId: string;
  localizationId: string;
  /** Follows the editor lock — no per-row translation on read-only versions. */
  disabled: boolean;
}

/**
 * Single-unit translate callback for the per-row buttons, or null when
 * machine translation is unavailable behind the shared gate.
 */
export const useUnitTranslateText = (
  input: UnitTranslateTextInput,
): ((sourceText: string) => Promise<string | null>) | null => {
  const { versionId, localizationId, disabled } = input;
  const { configured, lockedByPlan } = useMachineTranslationGate();
  const { invoke: translateUnits } = useTranslateLocalizationUnitsMutation();

  return useMemo(() => {
    if (!configured || lockedByPlan || disabled) {
      return null;
    }
    return async (sourceText: string) => {
      const translated = await translateUnits({
        versionId,
        localizationId,
        units: [{ path: 'unit', sourceText }],
      });
      return translated[0]?.translatedText ?? null;
    };
  }, [configured, lockedByPlan, disabled, translateUnits, versionId, localizationId]);
};

/** Optional units are media URLs — not text, never sent to the LLM. */
const isUntranslatedTextUnit = (unit: LocalizationTranslationUnit): boolean => {
  return !unit.optional && unit.sourceText.trim() !== '' && unit.translatedText.trim() === '';
};

/**
 * One-click machine translation of every untranslated unit, one
 * MACHINE_TRANSLATION_UNITS_PER_BATCH batch (= one LLM request) at a time.
 * Each batch lands in the working state as it returns, so a mid-run failure
 * keeps everything already translated — and because only untranslated units
 * are ever sent, clicking again naturally resumes from where it stopped.
 * Hidden when the instance has no AI provider configured; on cloud it ships
 * with paid plans — free-plan projects see the button locked with an
 * upgrade hint.
 */
export const MachineTranslationButton = (props: MachineTranslationButtonProps) => {
  const { versionId, localizationId, disabled, buildUnits, onApply } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { configured, lockedByPlan } = useMachineTranslationGate();
  const { invoke: translateUnits } = useTranslateLocalizationUnitsMutation();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // The run holds no editor lock, so the working state moves under it as the
  // translator keeps editing. Reading units through a render-refreshed ref
  // (not the click-time closure) is what lets user edits win (see below).
  const buildUnitsRef = useRef(buildUnits);
  buildUnitsRef.current = buildUnits;

  if (!configured) {
    return null;
  }

  const translating = progress !== null;

  const handleTranslate = async () => {
    const untranslated = buildUnitsRef.current().filter(isUntranslatedTextUnit);
    if (untranslated.length === 0) {
      toast({ variant: 'success', title: t('contents.localization.toast.translateEmpty') });
      return;
    }

    let applied = 0;
    let failure: unknown = null;
    // Paths this run applied. The final application's re-render may not have
    // flushed by the time the toast math below runs, so the live recount is
    // corrected by set difference instead of being trusted alone.
    const appliedPaths = new Set<string>();
    setProgress({ done: 0, total: untranslated.length });
    try {
      for (
        let offset = 0;
        offset < untranslated.length;
        offset += MACHINE_TRANSLATION_UNITS_PER_BATCH
      ) {
        const batch = untranslated.slice(offset, offset + MACHINE_TRANSLATION_UNITS_PER_BATCH);
        let translated: { path: string; translatedText: string }[];
        try {
          translated = await translateUnits({
            versionId,
            localizationId,
            units: batch.map((unit) => ({ path: unit.path, sourceText: unit.sourceText })),
          });
        } catch (error) {
          // Provider failures always surface as a thrown mutation — a batch
          // that RETURNS may still be shorter than what was sent (the model
          // legitimately skips units it returns empty text for), which is no
          // reason to stop; those units simply stay untranslated.
          failure = error;
          break;
        }
        // Fill blanks only: rows the translator filled while this batch was
        // in flight are no longer untranslated — their text wins over the
        // machine result.
        const stillUntranslated = new Set(
          buildUnitsRef
            .current()
            .filter(isUntranslatedTextUnit)
            .map((unit) => unit.path),
        );
        const applicable = new Map(
          translated
            .filter((unit) => stillUntranslated.has(unit.path))
            .map((unit) => [unit.path, unit.translatedText] as const),
        );
        if (applicable.size > 0) {
          onApply(applicable);
          applied += applicable.size;
          for (const path of applicable.keys()) {
            appliedPaths.add(path);
          }
        }
        setProgress({
          done: Math.min(offset + batch.length, untranslated.length),
          total: untranslated.length,
        });
      }
    } finally {
      setProgress(null);
    }

    if (applied === 0) {
      toast({
        variant: 'destructive',
        title: failure
          ? getErrorMessage(failure)
          : t('contents.localization.toast.translateFailure'),
      });
      return;
    }
    // Whether a re-click has work left is independent of whether a mutation
    // threw: a completed run may have skipped units the model returned empty,
    // and an aborted run may still have covered everything. Recounted live so
    // the number is exactly what clicking again would send — units the
    // translator filled mid-run are done work, not remaining work.
    const remaining = buildUnitsRef
      .current()
      .filter((unit) => isUntranslatedTextUnit(unit) && !appliedPaths.has(unit.path)).length;
    if (remaining > 0) {
      toast({
        variant: 'success',
        title: t('contents.localization.toast.translatePartial', { count: applied, remaining }),
      });
      return;
    }
    toast({
      variant: 'success',
      title: t('contents.localization.toast.translateSuccess', { count: applied }),
    });
  };

  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || translating || lockedByPlan}
      onClick={() => void handleTranslate()}
    >
      {translating ? (
        <SpinnerIcon className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <RiSparkling2Line className="mr-1 h-4 w-4" />
      )}
      {progress
        ? t('contents.localization.autoTranslateProgress', {
            done: progress.done,
            total: progress.total,
          })
        : t('contents.localization.autoTranslateButton')}
    </Button>
  );

  if (!lockedByPlan) {
    return button;
  }
  return (
    <Tooltip>
      {/* span wrapper: a disabled button swallows the hover events the tooltip needs */}
      <TooltipTrigger asChild>
        <span>{button}</span>
      </TooltipTrigger>
      <TooltipContent>{t('contents.localization.upgradeHint')}</TooltipContent>
    </Tooltip>
  );
};

MachineTranslationButton.displayName = 'MachineTranslationButton';
