import { Slider } from '@usertour-packages/slider';
import { useState } from 'react';

type ThemeSettingSliderProps = {
  text: string;
  placeholder?: string;
  name: string;
  defaultValue: number[];
  onValueChange?: (value: number[]) => void;
};
export const ThemeSettingSlider = (props: ThemeSettingSliderProps) => {
  const { text, name, defaultValue, onValueChange } = props;
  const [value, setValue] = useState(defaultValue);

  const handleValueChange = (v: number[]) => {
    setValue(v);
    if (onValueChange) {
      onValueChange(v);
    }
  };
  return (
    <div className="flex flex-row">
      <div className="text-sm grow">
        <label htmlFor={name} className="block text-sm leading-9">
          {text}
        </label>
      </div>
      <div className="flex-none w-36 relative flex flex-row items-center">
        <Slider
          defaultValue={defaultValue}
          className="bg-slate-300 w-28"
          max={100}
          step={1}
          onValueChange={handleValueChange}
        />
        <span className="w-12 text-center">{value[0]}%</span>
      </div>
    </div>
  );
};

ThemeSettingSlider.displayName = 'ThemeSettingSlider';
