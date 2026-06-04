import { EXTENSION_SELECT } from '@usertour/constants';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour/ui';
import { EyeNoneIcon, ModelIcon, RiAlertLine, RiMessageFill, TooltipIcon } from '@usertour/icons';
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

export const ContentType = (props: ContentTypeProps) => {
  const { onChange, zIndex, type } = props;
  const { t } = useTranslation();
  const labelKey = STEP_TYPE_LABEL_KEY[type];

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">{t('contentBuilder.flow.stepTypeTitle')}</h1>
      </div>

      <Select value={type} onValueChange={onChange}>
        <SelectTrigger variant="compact-muted" className="justify-start">
          {type === StepContentType.TOOLTIP && (
            <TooltipIcon className="w-4 h-4 mr-2 mt-0.5 flex-none" />
          )}
          {type === StepContentType.MODAL && (
            <ModelIcon className="w-4 h-4 mr-2 mt-0.5 flex-none" />
          )}
          {type === StepContentType.BUBBLE && <RiMessageFill className="w-4 h-4 mr-2 flex-none" />}
          {type === StepContentType.HIDDEN && <EyeNoneIcon className="w-4 h-4 mr-2 flex-none" />}

          <div className="grow text-left">
            <SelectValue asChild>
              <div>{labelKey ? t(labelKey) : type}</div>
            </SelectValue>
          </div>
        </SelectTrigger>

        <SelectContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
          <SelectItem value={StepContentType.BUBBLE}>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <RiMessageFill size={16} />
                <span className="text-xs">{t('contentBuilder.flow.stepType.bubble')}</span>
              </div>
              <p className="text-xs max-w-60 text-muted-foreground">
                {t('contentBuilder.flow.stepType.bubbleDescription')}
              </p>
            </div>
          </SelectItem>
          <SelectItem value={StepContentType.TOOLTIP}>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <TooltipIcon width={16} height={16} className="mt-0.5" />
                <span className="text-xs">{t('contentBuilder.flow.stepType.tooltip')}</span>
              </div>
              <p className="text-xs max-w-60 text-muted-foreground">
                {t('contentBuilder.flow.stepType.tooltipDescription')}
              </p>
            </div>
          </SelectItem>
          <SelectItem value={StepContentType.MODAL}>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <ModelIcon width={16} height={16} className="mt-0.5" />
                <span className="text-xs">{t('contentBuilder.flow.stepType.modal')}</span>
              </div>
              <p className="text-xs max-w-60 text-muted-foreground">
                {t('contentBuilder.flow.stepType.modalDescription')}
              </p>
            </div>
          </SelectItem>
          <SelectItem value={StepContentType.HIDDEN}>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <EyeNoneIcon width={16} height={16} />
                <span className="text-xs">{t('contentBuilder.flow.stepType.hidden')}</span>
              </div>
              <p className="text-xs max-w-60 text-muted-foreground">
                {t('contentBuilder.flow.stepType.hiddenDescription')}
              </p>
            </div>
          </SelectItem>
        </SelectContent>

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
      </Select>
    </div>
  );
};
ContentType.displayName = 'ContentType';
