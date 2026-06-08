import { useTranslation } from 'react-i18next';
import { BooleanField, FieldCard } from '@usertour/ui';

export type ContentSettingsData = {
  enabledBackdrop: boolean;
  skippable: boolean;
  enabledBlockTarget: boolean;
  explicitCompletionStep?: boolean;
};

export interface ContentSettingsProps {
  data: ContentSettingsData;
  type: string;
  onChange: (value: ContentSettingsData) => void;
}

// Controlled: renders straight from `data` and writes every toggle back through
// `onChange` — the parent step data is the single source of truth (no local
// copy, so external changes flow through immediately).
export const ContentSettings = (props: ContentSettingsProps) => {
  const { data, onChange, type } = props;
  const { t } = useTranslation();

  const update = (patch: Partial<ContentSettingsData>) => {
    onChange({ ...data, ...patch });
  };

  // The backdrop explainer differs by step type; bubble has none.
  const backdropTooltip =
    type === 'tooltip'
      ? t('contentBuilder.flow.addBackdropTooltipHint')
      : type === 'modal'
        ? t('contentBuilder.flow.addBackdropModalHint')
        : undefined;

  return (
    <FieldCard title={t('contentBuilder.flow.settings')}>
      <BooleanField
        label={t('contentBuilder.flow.explicitCompletionStep')}
        tooltip={t('contentBuilder.flow.explicitCompletionStepHint')}
        checked={data.explicitCompletionStep ?? false}
        onChange={(checked) => update({ explicitCompletionStep: checked })}
      />
      <BooleanField
        label={t('contentBuilder.flow.skippable')}
        checked={data.skippable}
        onChange={(checked) => update({ skippable: checked })}
      />
      <BooleanField
        label={t('contentBuilder.flow.addBackdrop')}
        tooltip={backdropTooltip}
        checked={data.enabledBackdrop}
        onChange={(checked) => update({ enabledBackdrop: checked })}
      />
      {data.enabledBackdrop && type === 'tooltip' && (
        <BooleanField
          label={t('contentBuilder.flow.blockTargetClicks')}
          checked={data.enabledBlockTarget}
          onChange={(checked) => update({ enabledBlockTarget: checked })}
        />
      )}
    </FieldCard>
  );
};
ContentSettings.displayName = 'ContentSettings';
