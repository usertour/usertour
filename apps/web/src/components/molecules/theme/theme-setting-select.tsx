import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { HelpTooltip } from '@usertour-ui/shared-components';
import { cn } from '@usertour-ui/ui-utils';

export type ThemeSettingSelectItemsType = {
  value: string;
  name: string;
};
const fontWeightItems = [
  { value: '100', name: 'Thin 100' },
  { value: '200', name: 'Extra light 200' },
  { value: '300', name: 'Light 300' },
  { value: '400', name: 'Normal 400' },
  { value: '500', name: 'Medium 500' },
  { value: '600', name: 'Semibold 600' },
  { value: '700', name: 'Bold 700' },
  { value: '800', name: 'Extra bold 800' },
  { value: '900', name: 'Black 900' },
];

type ThemeSelectProps = {
  text: string;
  placeholder?: string;
  defaultValue: string;
  name: string;
  items?: ThemeSettingSelectItemsType[];
  onValueChange?: (value: string) => void;
  tooltip?: string;
  vertical?: boolean;
};

export const ThemeSettingSelect = (props: ThemeSelectProps) => {
  const {
    text,
    placeholder = '',
    defaultValue,
    onValueChange,
    name,
    items = fontWeightItems,
    tooltip,
    vertical = false,
  } = props;
  return (
    <div className={cn('flex', vertical ? 'flex-col' : 'flex-row')}>
      <div className="text-sm grow flex flex-row items-center space-x-1">
        <label htmlFor={name} className="block text-sm leading-9">
          {text}
        </label>
        {tooltip && <HelpTooltip>{tooltip}</HelpTooltip>}
      </div>
      <div className={cn('relative', vertical ? 'w-full' : 'flex-none w-36')}>
        <Select defaultValue={defaultValue} onValueChange={onValueChange}>
          <SelectTrigger className="justify-start flex h-8" id={name}>
            <div className="grow text-left">
              <SelectValue placeholder={placeholder} />
            </div>
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              {items.map((item, index) => {
                return (
                  <SelectItem key={index} value={item.value}>
                    {item.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </SelectPortal>
        </Select>
      </div>
    </div>
  );
};

ThemeSettingSelect.displayName = 'ThemeSettingSelect';
