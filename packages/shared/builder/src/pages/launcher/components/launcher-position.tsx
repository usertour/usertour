import { CubeIcon } from '@radix-ui/react-icons';
import { EXTENSION_SELECT } from '@usertour-ui/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour-ui/select';
import { LauncherPositionType } from '@usertour-ui/types';
interface LauncherPositionProps {
  type?: LauncherPositionType;
  onChange: (value: LauncherPositionType) => void;
  zIndex: number;
}

export const LauncherPosition = (props: LauncherPositionProps) => {
  const { onChange, zIndex, type = LauncherPositionType.TARGET } = props;

  const handleTypeChange = (value: LauncherPositionType) => {
    onChange(value);
  };

  return (
    <div className="space-y-3 ">
      <div className="flex justify-between items-center space-x-1	">
        <div className="flex flex-row justify-between items-center space-x-1 ">
          <h1 className="text-sm">Reference</h1>
        </div>
      </div>
      <Select defaultValue={type} onValueChange={handleTypeChange} value={type}>
        <SelectTrigger className="justify-start flex h-8">
          <CubeIcon className="flex-none mr-2" />
          <div className="grow text-left">
            <SelectValue placeholder="" asChild>
              <div className="capitalize">{type}</div>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
          <SelectItem value={LauncherPositionType.TARGET} className="cursor-pointer">
            Target element
          </SelectItem>
          <SelectItem value={LauncherPositionType.LAUNCHER} className="cursor-pointer">
            Launcher
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
LauncherPosition.displayName = 'LauncherPosition';
