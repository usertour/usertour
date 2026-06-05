import { EXTENSION_SELECT } from '@usertour/constants';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  CompactSelectContent,
  CompactSelectItem,
  CompactSelectRoot,
  CompactSelectTrigger,
  CompactSelectValue,
} from '@usertour/ui';
import { EyeNoneIcon, ModelIcon, RiAlertLine, RiMessageLine, TooltipIcon } from '@usertour/icons';
import { StepContentType } from '@usertour/types';
import { useTranslation } from 'react-i18next';

interface ContentTypeProps {
  type: string;
  onChange: (value: string) => void;
  zIndex: number;
}

const STEP_TYPE_LABEL_KEY: Record<string, string> = {
  [StepContentType.BUBBLE]: 'contentBuilder.flow.stepType.bubble',
  [StepContentType.TOOLTIP]: 'contentBuilder.flow.stepType.tooltip',
  [StepContentType.MODAL]: 'contentBuilder.flow.stepType.modal',
  [StepContentType.HIDDEN]: 'contentBuilder.flow.stepType.hidden',
};

const getStepTypeIcon = (stepType: string) => {
  switch (stepType) {
    case StepContentType.TOOLTIP:
      return <TooltipIcon width={16} height={16} className="opacity-70" />;
    case StepContentType.MODAL:
      return <ModelIcon width={16} height={16} className="opacity-70" />;
    case StepContentType.BUBBLE:
      return <RiMessageLine size={16} className="opacity-70" />;
    case StepContentType.HIDDEN:
      return <EyeNoneIcon width={16} height={16} className="opacity-70" />;
    default:
      return null;
  }
};

export const ContentType = (props: ContentTypeProps) => {
  const { onChange, zIndex, type } = props;
  const { t } = useTranslation();

  const renderOption = (stepType: StepContentType) => (
    <CompactSelectItem
      key={stepType}
      value={stepType}
      label={t(STEP_TYPE_LABEL_KEY[stepType])}
      className="items-start gap-2.5 py-2"
    >
      <span className="mt-0.5 flex shrink-0 items-center">{getStepTypeIcon(stepType)}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium leading-none">{t(STEP_TYPE_LABEL_KEY[stepType])}</span>
        <p className="text-xs leading-snug text-muted-foreground">
          {t(`contentBuilder.flow.stepType.${stepType}Description`)}
        </p>
      </div>
    </CompactSelectItem>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">{t('contentBuilder.flow.stepTypeTitle')}</h1>
      </div>

      <CompactSelectRoot
        value={type}
        onValueChange={(value) => onChange(value as string)}
        modal={false}
      >
        <CompactSelectTrigger>
          <span className="flex shrink-0 items-center">{getStepTypeIcon(type)}</span>
          <CompactSelectValue className="min-w-0 flex-1 truncate text-left">
            {(value) => {
              const key = STEP_TYPE_LABEL_KEY[value as string];
              return key ? t(key) : (value as string);
            }}
          </CompactSelectValue>
        </CompactSelectTrigger>
        <CompactSelectContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
          {renderOption(StepContentType.BUBBLE)}
          {renderOption(StepContentType.TOOLTIP)}
          {renderOption(StepContentType.MODAL)}
          {renderOption(StepContentType.HIDDEN)}
        </CompactSelectContent>
      </CompactSelectRoot>

      {type === StepContentType.HIDDEN && (
        <Alert variant="warning">
          <RiAlertLine className="h-4 w-4" />
          <AlertTitle>{t('contentBuilder.flow.hiddenWarningTitle')}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{t('contentBuilder.flow.hiddenWarning1')}</span>
            <span>{t('contentBuilder.flow.hiddenWarning2')}</span>
            <span>{t('contentBuilder.flow.hiddenWarning3')}</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
ContentType.displayName = 'ContentType';
