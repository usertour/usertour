import { RiChat2Line, RiEyeOffLine, RiMessage2Line, RiWindow2Line } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { StepContentType } from '@usertour/types';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Callout } from '@/pages/contents/components/builder/shared/callout';

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
                  : 'border-border bg-surface dark:bg-surface-raised/50 text-muted-foreground hover:border-border',
              )}
            >
              <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
              <span>{t(labelKey)}</span>
            </button>
          );
        })}
      </div>

      {type === StepContentType.HIDDEN && (
        <Callout variant="warning" title={t('contentBuilder.flow.hiddenWarningTitle')}>
          <div className="space-y-2">
            <p>{t('contentBuilder.flow.hiddenWarning1')}</p>
            <p>{t('contentBuilder.flow.hiddenWarning2')}</p>
            <p>{t('contentBuilder.flow.hiddenWarning3')}</p>
          </div>
        </Callout>
      )}
    </div>
  );
};
ContentType.displayName = 'ContentType';
