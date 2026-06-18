import { LauncherTooltipSettings } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { BooleanField, FieldCard } from '@usertour/ui';

export interface LauncherSettingsProps {
  data: LauncherTooltipSettings;
  onChange: (value: LauncherTooltipSettings) => void;
}

export const LauncherSettings = (props: LauncherSettingsProps) => {
  const { data, onChange } = props;
  const { t } = useTranslation();

  return (
    <FieldCard title={t('contentBuilder.launcher.settings')}>
      <BooleanField
        label={t('contentBuilder.launcher.dismissAfterFirstActivation')}
        checked={data.dismissAfterFirstActivation}
        onChange={(checked) => onChange({ ...data, dismissAfterFirstActivation: checked })}
      />
    </FieldCard>
  );
};

LauncherSettings.displayName = 'LauncherSettings';
