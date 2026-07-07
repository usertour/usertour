import { useAppContext } from '@/contexts/app-context';
import { useSubscription } from '@/hooks/use-subscription';
import { getErrorMessage } from '@usertour/helpers';
import type { LocalizationTranslationUnit } from '@usertour/helpers';
import { useTranslateLocalizationUnitsMutation } from '@usertour/hooks';
import { RiSparkling2Line, SpinnerIcon } from '@usertour/icons';
import { PlanType } from '@usertour/types';
import { Button, Tooltip, TooltipContent, TooltipTrigger, useToast } from '@usertour/ui';
import { useMemo, useState } from 'react';
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

/**
 * One-click machine translation of every untranslated unit. Hidden when the
 * instance has no translation key configured; on cloud it ships with paid
 * plans — free-plan projects see the button locked with an upgrade hint.
 */
export const MachineTranslationButton = (props: MachineTranslationButtonProps) => {
  const { versionId, localizationId, disabled, buildUnits, onApply } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { configured, lockedByPlan } = useMachineTranslationGate();
  const { invoke: translateUnits } = useTranslateLocalizationUnitsMutation();
  const [translating, setTranslating] = useState(false);

  if (!configured) {
    return null;
  }

  const handleTranslate = async () => {
    // Optional units are media URLs — not text, never sent to the LLM.
    const untranslated = buildUnits().filter(
      (unit) =>
        !unit.optional && unit.sourceText.trim() !== '' && unit.translatedText.trim() === '',
    );
    if (untranslated.length === 0) {
      toast({ variant: 'success', title: t('contents.localization.toast.translateEmpty') });
      return;
    }
    setTranslating(true);
    try {
      const translated = await translateUnits({
        versionId,
        localizationId,
        units: untranslated.map((unit) => ({ path: unit.path, sourceText: unit.sourceText })),
      });
      const translations = new Map(
        translated.map((unit) => [unit.path, unit.translatedText] as const),
      );
      if (translations.size === 0) {
        toast({
          variant: 'destructive',
          title: t('contents.localization.toast.translateFailure'),
        });
        return;
      }
      onApply(translations);
      toast({
        variant: 'success',
        title: t('contents.localization.toast.translateSuccess', {
          count: translations.size,
        }),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    } finally {
      setTranslating(false);
    }
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
      {t('contents.localization.autoTranslateButton')}
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
