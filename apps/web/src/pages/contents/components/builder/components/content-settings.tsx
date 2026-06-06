import { Label, Switch, QuestionTooltip } from '@usertour/ui';
import { useTranslation } from 'react-i18next';

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

  return (
    <div className="space-y-3">
      <h1 className="text-sm">{t('contentBuilder.flow.settings')}</h1>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="explicit-completion-step" className="flex flex-row space-x-1">
            <span className="font-normal">{t('contentBuilder.flow.explicitCompletionStep')}</span>
            <QuestionTooltip>{t('contentBuilder.flow.explicitCompletionStepHint')}</QuestionTooltip>
          </Label>
          <Switch
            id="explicit-completion-step"
            className="data-[state=unchecked]:bg-input"
            checked={data.explicitCompletionStep ?? false}
            onCheckedChange={(checked) => update({ explicitCompletionStep: checked })}
          />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="skippable" className="flex flex-col space-y-1">
            <span className="font-normal">{t('contentBuilder.flow.skippable')}</span>
          </Label>
          <Switch
            id="skippable"
            className="data-[state=unchecked]:bg-input"
            checked={data.skippable}
            onCheckedChange={(checked) => update({ skippable: checked })}
          />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <div className="flex space-x-2 grow">
            <Label htmlFor="enable-backdrop" className="flex space-y-1">
              <span className="font-normal">{t('contentBuilder.flow.addBackdrop')}</span>
            </Label>
            <QuestionTooltip>
              {type === 'tooltip' && t('contentBuilder.flow.addBackdropTooltipHint')}
              {type === 'modal' && t('contentBuilder.flow.addBackdropModalHint')}
            </QuestionTooltip>
          </div>
          <Switch
            id="enable-backdrop"
            className="data-[state=unchecked]:bg-input"
            checked={data.enabledBackdrop}
            onCheckedChange={(checked) => update({ enabledBackdrop: checked })}
          />
        </div>
        {data.enabledBackdrop && type === 'tooltip' && (
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="enable-block-target" className="flex flex-col space-y-1">
              <span className="font-normal">{t('contentBuilder.flow.blockTargetClicks')}</span>
            </Label>
            <Switch
              id="enable-block-target"
              className="data-[state=unchecked]:bg-input"
              checked={data.enabledBlockTarget}
              onCheckedChange={(checked) => update({ enabledBlockTarget: checked })}
            />
          </div>
        )}
      </div>
    </div>
  );
};
ContentSettings.displayName = 'ContentSettings';
