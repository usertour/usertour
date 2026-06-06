import { Alert, AlertDescription, AlertTitle } from '@usertour/ui';
import {
  RiAlertLine,
  RiChat2Line,
  RiEyeOffLine,
  RiMessage2Line,
  RiWindow2Line,
} from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { StepContentType } from '@usertour/types';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';

interface ContentTypeProps {
  type: string;
  onChange: (value: string) => void;
}

// 2×2 grid of step types. Order matches the design: Modal, Tooltip, Speech
// Bubble, Hidden.
const STEP_TYPES: {
  value: StepContentType;
  Icon: ComponentType<{ className?: string }>;
  labelKey: string;
}[] = [
  {
    value: StepContentType.MODAL,
    Icon: RiWindow2Line,
    labelKey: 'contentBuilder.flow.stepType.modal',
  },
  {
    value: StepContentType.TOOLTIP,
    Icon: RiChat2Line,
    labelKey: 'contentBuilder.flow.stepType.tooltip',
  },
  {
    value: StepContentType.BUBBLE,
    Icon: RiMessage2Line,
    labelKey: 'contentBuilder.flow.stepType.bubble',
  },
  {
    value: StepContentType.HIDDEN,
    Icon: RiEyeOffLine,
    labelKey: 'contentBuilder.flow.stepType.hidden',
  },
];

export const ContentType = (props: ContentTypeProps) => {
  const { onChange, type } = props;
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <h1 className="text-sm">{t('contentBuilder.flow.stepTypeTitle')}</h1>

      <div className="grid grid-cols-2 gap-2">
        {STEP_TYPES.map(({ value, Icon, labelKey }) => {
          const active = type === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border px-2 py-3.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-accent/50 text-primary ring-2 ring-primary/10'
                  : 'border-border bg-slate-50 text-slate-600 hover:border-slate-300',
              )}
            >
              <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-slate-400')} />
              <span>{t(labelKey)}</span>
            </button>
          );
        })}
      </div>

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
