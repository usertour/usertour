import { BUILDER_Z } from '@usertour/constants';
import { CompactSelect } from '@usertour/ui';
import { LauncherPositionType } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { FieldSection } from '@usertour/ui';

interface LauncherPositionProps {
  type?: LauncherPositionType;
  onChange: (value: LauncherPositionType) => void;
}

export const LauncherPosition = (props: LauncherPositionProps) => {
  const { onChange, type = LauncherPositionType.TARGET } = props;
  const { t } = useTranslation();

  const options = [
    {
      value: LauncherPositionType.TARGET,
      label: t('contentBuilder.launcher.reference.targetElement'),
    },
    {
      value: LauncherPositionType.LAUNCHER,
      label: t('contentBuilder.launcher.reference.launcher'),
    },
  ];

  return (
    <FieldSection title={t('contentBuilder.launcher.reference.label')}>
      <CompactSelect
        options={options}
        value={type}
        onChange={(value) => onChange(value as LauncherPositionType)}
        className="w-full bg-surface shadow-none"
        contentStyle={{ zIndex: BUILDER_Z.popover }}
      />
    </FieldSection>
  );
};

LauncherPosition.displayName = 'LauncherPosition';
