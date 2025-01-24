import { Input } from "@usertour-ui/input";
import { HelpTooltip } from "@usertour-ui/shared-components";
import { cn } from "@usertour-ui/ui-utils";
import { ChangeEvent } from "react";

type ThemeSettingInputProps = {
  text: string;
  placeholder?: string;
  name: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disableUnit?: boolean;
  tooltip?: string;
};
export const ThemeSettingInput = (props: ThemeSettingInputProps) => {
  const {
    text,
    placeholder = "",
    name,
    onChange,
    defaultValue,
    disableUnit = false,
    tooltip,
  } = props;
  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      if (onChange) {
        onChange(e.target.value);
      }
    }
  };
  return (
    <div className="flex flex-row">
      <div className="text-sm grow flex items-center space-x-1">
        <label htmlFor={name} className="block text-sm leading-9">
          {text}
        </label>
        {tooltip && <HelpTooltip>{tooltip}</HelpTooltip>}
      </div>
      <div className="flex-none w-36 relative">
        <Input
          type="text"
          id={name}
          name={name}
          value={defaultValue}
          onChange={handleOnChange}
          className={cn(
            "py-3 px-4 ps-4 pe-8 block w-full  shadow-sm rounded-lg text-sm ",
            disableUnit ? "pe-4" : "pe-8"
          )}
          placeholder={placeholder}
        />
        {!disableUnit && (
          <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none z-10 pe-4">
            <span className="text-gray-500">px</span>
          </div>
        )}
      </div>
    </div>
  );
};

ThemeSettingInput.displayName = "ThemeSettingInput";
