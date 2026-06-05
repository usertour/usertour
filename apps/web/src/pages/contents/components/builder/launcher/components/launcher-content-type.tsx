import { LauncherIcon, RiEyeOffLine, RiInformationLine, RiSquareLine } from '@usertour/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour/ui';
import { LauncherDataType } from '@usertour/types';
import { useTranslation } from 'react-i18next';

interface LauncherTypeProps {
  type: LauncherDataType;
  zIndex: number;
  onChange: (value: LauncherDataType) => void;
}

export const LauncherContentType = ({ zIndex, type, onChange }: LauncherTypeProps) => {
  const { t } = useTranslation();

  const getIcon = (dataType: LauncherDataType) => {
    const iconProps = { width: 16, height: 16 };
    switch (dataType) {
      case LauncherDataType.BEACON:
        return <LauncherIcon {...iconProps} />;
      case LauncherDataType.ICON:
        return <RiInformationLine size={16} className="text-current" />;
      case LauncherDataType.BUTTON:
        return <RiSquareLine size={16} className="text-current" />;
      case LauncherDataType.HIDDEN:
        return <RiEyeOffLine size={16} className="text-current" />;
    }
  };

  const getLabel = (dataType: LauncherDataType) => t(`contentBuilder.launcher.type.${dataType}`);
  const getDescription = (dataType: LauncherDataType) =>
    t(`contentBuilder.launcher.type.${dataType}Description`);

  return (
    <Select value={type} onValueChange={onChange}>
      <SelectTrigger variant="compact-muted" className="flex justify-start">
        {getIcon(type)}
        <div className="grow text-left ml-2">
          <SelectValue placeholder="" asChild>
            <div>{getLabel(type)}</div>
          </SelectValue>
        </div>
      </SelectTrigger>

      <SelectContent style={{ zIndex }}>
        {Object.values(LauncherDataType).map((value) => (
          <SelectItem key={value} value={value} className="cursor-pointer">
            <div className="flex flex-col">
              <div className="flex flex-row space-x-1 items-center">
                {getIcon(value)}
                <span className="text-xs font-bold">{getLabel(value)}</span>
              </div>
              <div className="max-w-60 text-xs text-muted-foreground">{getDescription(value)}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
LauncherContentType.displayName = 'LauncherContentType';
