import { EXTENSION_SELECT } from '@usertour/constants';
import { RiBox3Line } from '@usertour/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour/ui';
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

  return (
    <FieldSection title={t('contentBuilder.launcher.reference.label')}>
      <Select value={type} onValueChange={(value) => onChange(value as LauncherPositionType)}>
        <SelectTrigger variant="compact-muted" className="flex justify-start">
          <RiBox3Line className="flex-none mr-2 h-4 w-4" />
          <div className="grow text-left">
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
          <SelectItem value={LauncherPositionType.TARGET} className="cursor-pointer">
            {t('contentBuilder.launcher.reference.targetElement')}
          </SelectItem>
          <SelectItem value={LauncherPositionType.LAUNCHER} className="cursor-pointer">
            {t('contentBuilder.launcher.reference.launcher')}
          </SelectItem>
        </SelectContent>
      </Select>
    </FieldSection>
  );
};

LauncherPosition.displayName = 'LauncherPosition';
