import { Label, Switch } from '@usertour/ui';
import { LauncherTooltipSettings } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

export interface LauncherSettingsProps {
  data: LauncherTooltipSettings;
  onChange: (value: LauncherTooltipSettings) => void;
}

export const LauncherSettings = (props: LauncherSettingsProps) => {
  const { data, onChange } = props;
  const { t } = useTranslation();

  return (
    <FieldSection title={t('contentBuilder.launcher.settings')}>
      <div className="flex flex-col bg-slate-50 p-3.5 rounded-lg space-y-2">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="dismiss-after-first-activation" className="font-normal">
            {t('contentBuilder.launcher.dismissAfterFirstActivation')}
          </Label>
          <Switch
            className="data-[state=unchecked]:bg-input"
            id="dismiss-after-first-activation"
            checked={data.dismissAfterFirstActivation}
            onCheckedChange={(checked) =>
              onChange({ ...data, dismissAfterFirstActivation: checked })
            }
            aria-label={t('contentBuilder.launcher.dismissAfterFirstActivation')}
          />
        </div>
      </div>
    </FieldSection>
  );
};

LauncherSettings.displayName = 'LauncherSettings';
