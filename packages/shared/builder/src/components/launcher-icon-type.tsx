import { IconsList } from "@usertour-ui/sdk";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@usertour-ui/select";

interface LauncherIconTypeProps {
  type: string;
  zIndex: number;
  onChange: (value: string) => void;
}

export const LauncherIconType = ({
  type,
  zIndex,
  onChange,
}: LauncherIconTypeProps) => {
  const ActiveIcon = IconsList.find((item) => item.name === type)?.ICON;

  return (
    <Select defaultValue={type} onValueChange={onChange} value={type}>
      <SelectTrigger className="justify-start flex h-8">
        {ActiveIcon && <ActiveIcon width={16} height={16} />}
        <div className="grow text-left ml-2">
          <SelectValue placeholder="" asChild>
            <div className="capitalize">{type}</div>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent style={{ zIndex }}>
        {IconsList.map(({ ICON, name, text }) => (
          <SelectItem value={name} className="cursor-pointer" key={name}>
            <div className="flex items-center gap-1">
              <ICON width={16} height={16} />
              <span className="text-xs font-bold">{text}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
LauncherIconType.displayName = "LauncherIconType";
