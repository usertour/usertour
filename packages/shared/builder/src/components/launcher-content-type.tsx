import { EyeNoneIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { LauncherIcon } from '@usertour-packages/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { LauncherDataType } from '@usertour/types';

interface LauncherTypeProps {
  type: LauncherDataType;
  zIndex: number;
  onChange: (value: LauncherDataType) => void;
}

export const LauncherContentType = ({ zIndex, type, onChange }: LauncherTypeProps) => {
  const getIcon = (dataType: LauncherDataType) => {
    const iconProps = { width: 16, height: 16 };
    switch (dataType) {
      case LauncherDataType.BEACON:
        return <LauncherIcon {...iconProps} />;
      case LauncherDataType.ICON:
        return <InfoCircledIcon {...iconProps} />;
      case LauncherDataType.HIDDEN:
        return <EyeNoneIcon {...iconProps} />;
    }
  };

  const getDescription = (dataType: LauncherDataType) => {
    switch (dataType) {
      case LauncherDataType.BEACON:
        return 'Shows a pulsing beacon. Great for drawing attention to new features.';
      case LauncherDataType.ICON:
        return 'Shows a simple icon. Great for explanation tooltips.';
      case LauncherDataType.HIDDEN:
        return 'Hides the launcher. Only shows when triggered.';
      default:
        return '';
    }
  };

  return (
    <Select value={type} onValueChange={onChange}>
      <SelectTrigger className="justify-start flex h-8">
        {getIcon(type)}
        <div className="grow text-left ml-2">
          <SelectValue placeholder="" asChild>
            <div className="capitalize">{type}</div>
          </SelectValue>
        </div>
      </SelectTrigger>

      <SelectContent style={{ zIndex }}>
        {Object.values(LauncherDataType).map((value) => (
          <SelectItem key={value} value={value} className="cursor-pointer">
            <div className="flex flex-col">
              <div className="flex flex-row space-x-1 items-center">
                {getIcon(value)}
                <span className="text-xs font-bold capitalize">{value}</span>
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
