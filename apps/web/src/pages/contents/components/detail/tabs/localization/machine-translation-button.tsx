import { useAppContext } from '@/contexts/app-context';
import { useSubscription } from '@/hooks/use-subscription';
import { getErrorMessage } from '@usertour/helpers';
import type { LocalizationTranslationUnit } from '@usertour/helpers';
import { useTranslateLocalizationUnitsMutation } from '@usertour/hooks';
import { RiSparkling2Line, SpinnerIcon } from '@usertour/icons';
import { PlanType } from '@usertour/types';
import { Button, Tooltip, TooltipContent, TooltipTrigger, useToast } from '@usertour/ui';
import { useState } from 'react';
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
 * One-click machine translation of every untranslated unit. Hidden when the
 * instance has no translation key configured; on cloud it ships with paid
 * plans — free-plan projects see the button locked with an upgrade hint.
 */
export const MachineTranslationButton = (props: MachineTranslationButtonProps) => {
  const { versionId, localizationId, disabled, buildUnits, onApply } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { globalConfig } = useAppContext();
  const { planType } = useSubscription();
  const { invoke: translateUnits } = useTranslateLocalizationUnitsMutation();
  const [translating, setTranslating] = useState(false);

  if (!globalConfig?.machineTranslationEnabled) {
    return null;
  }
  const lockedByPlan = !globalConfig.isSelfHostedMode && planType === PlanType.HOBBY;

  const handleTranslate = async () => {
    const untranslated = buildUnits().filter(
      (unit) => unit.sourceText.trim() !== '' && unit.translatedText.trim() === '',
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
