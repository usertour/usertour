import { LauncherTooltipSettings } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { BooleanField, SettingsCard } from '@/pages/contents/components/builder/shared/fields';

export interface LauncherSettingsProps {
  data: LauncherTooltipSettings;
  onChange: (value: LauncherTooltipSettings) => void;
}

export const LauncherSettings = (props: LauncherSettingsProps) => {
  const { data, onChange } = props;
  const { t } = useTranslation();

  return (
    <SettingsCard title={t('contentBuilder.launcher.settings')}>
      <BooleanField
        label={t('contentBuilder.launcher.dismissAfterFirstActivation')}
        checked={data.dismissAfterFirstActivation}
        onChange={(checked) => onChange({ ...data, dismissAfterFirstActivation: checked })}
      />
    </SettingsCard>
  );
};

LauncherSettings.displayName = 'LauncherSettings';
