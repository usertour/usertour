import { EXTENSION_SELECT } from '@usertour/constants';
import { SelectPopover } from '@usertour/ui';
import { LauncherPositionType } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

interface LauncherPositionProps {
  type?: LauncherPositionType;
  onChange: (value: LauncherPositionType) => void;
  zIndex: number;
}

export const LauncherPosition = (props: LauncherPositionProps) => {
  const { onChange, zIndex, type = LauncherPositionType.TARGET } = props;
  const { t } = useTranslation();

  const options = [
    {
      value: LauncherPositionType.TARGET,
      name: t('contentBuilder.launcher.reference.targetElement'),
    },
    {
      value: LauncherPositionType.LAUNCHER,
      name: t('contentBuilder.launcher.reference.launcher'),
    },
  ];

  return (
    <FieldSection title={t('contentBuilder.launcher.reference.label')}>
      <SelectPopover
        options={options}
        value={type}
        onValueChange={(value) => onChange(value as LauncherPositionType)}
        className="w-full"
        contentStyle={{ zIndex: zIndex + EXTENSION_SELECT }}
      />
    </FieldSection>
  );
};

LauncherPosition.displayName = 'LauncherPosition';
