import type { ColorResult } from "react-color";
import * as Popover from "@radix-ui/react-popover";
import { SketchPicker } from "react-color";
import {
  CSSProperties,
  ChangeEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Button } from "@usertour-ui/button";
import { cn, isDark } from "@usertour-ui/ui-utils";
import { CheckboxIcon, RemoveColorIcon } from "@usertour-ui/icons";
import { TAILWINDCSS_COLORS } from "@usertour-ui/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";
import { Separator } from "@usertour-ui/separator";
import { Input } from "@usertour-ui/input";

const firstLetterToUpperCase = (word: string) => {
  const firstLetter = word.charAt(0);

  const firstLetterCap = firstLetter.toUpperCase();

  const remainingLetters = word.slice(1);

  return firstLetterCap + remainingLetters;
};

type PickerProps = {
  color?: string;
  isAuto?: boolean;
  showAutoButton?: boolean;
  onChange: (isAuto: boolean, color?: string) => void;
};
type TailWindColorDataType = { name: string; level: string; color: string };

const formatData = (colors: any) => {
  const rows: TailWindColorDataType[][] = [];
  for (const key in colors) {
    const cols: TailWindColorDataType[] = [];
    for (const k2 in colors[key]) {
      const color = colors[key][k2];
      cols.push({ name: key, level: k2, color });
    }
    rows.push(cols);
  }
  return rows;
};

const tailwindColorData: TailWindColorDataType[][] =
  formatData(TAILWINDCSS_COLORS);

const Picker = (props: PickerProps) => {
  const { color, onChange, isAuto = false, showAutoButton = true } = props;
  const [inputColor, setInputColor] = useState(!isAuto ? color : "");

  const handleSubmit = useCallback(() => {
    if (inputColor) {
      onChange(false, inputColor);
    } else {
      onChange(true, "");
    }
  }, [inputColor]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setInputColor(e.target.value);
    }
  };
  const handleRemoveColor = () => {
    onChange(true);
  };
  const handleOnClick = (color: string) => {
    onChange(false, color);
  };

  return (
    <>
      <div className="bg-background p-4 rounded space-y-3">
        <div className="flex flex-row items-center space-x-2">
          <div
            className="w-6 h-6"
            style={{ backgroundColor: inputColor || color }}
          ></div>
          <Input
            value={!isAuto ? inputColor : ""}
            className="w-36 h-8"
            placeholder={isAuto ? color : ""}
            onChange={handleInputChange}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckboxIcon
                  width={28}
                  height={28}
                  onClick={handleSubmit}
                  className="text-primary cursor-pointer"
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-slate-700">
                Use this color
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {showAutoButton && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <RemoveColorIcon
                    width={20}
                    height={20}
                    onClick={handleRemoveColor}
                    className="cursor-pointer"
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-slate-700">
                  Remove color(use default)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <Separator />
        <div className="flex flex-row justify-between text-sm">
          <span>Tailwind CSS colors</span>
        </div>
        <div className="flex flex-row">
          {tailwindColorData.map((row, index) => (
            <div className="flex flex-col mr-[1px] last:mr-0" key={index}>
              {row.map((col, i) => (
                <TooltipProvider key={index + "-" + i}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="w-4 h-4 hover:scale-125 mb-[1px] last:mb-0 cursor-pointer"
                        onClick={() => {
                          handleOnClick(col.color);
                        }}
                        style={{ backgroundColor: col.color }}
                      ></div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-700">
                      Tailwind {firstLetterToUpperCase(col.name)} {col.level}:{" "}
                      {col.color}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

type ThemeColorPickerProps = {
  defaultColor: string;
  autoColor?: string;
  isAutoColor?: boolean;
  showAutoButton?: boolean;
  onChange?: (color: string) => void;
  className?: string;
};

export const ThemeColorPicker = (props: ThemeColorPickerProps) => {
  const {
    defaultColor,
    onChange,
    isAutoColor = false,
    className = "",
    autoColor = "",
    showAutoButton = false,
  } = props;
  const [color, setColor] = useState<string>(
    isAutoColor ? autoColor : defaultColor
  );
  const [isAuto, setIsAuto] = useState(isAutoColor);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isAuto && autoColor) {
      setColor(autoColor);
    }
  }, [autoColor, isAuto]);

  const handleColorChange = (isAuto: boolean, color: string = "") => {
    setOpen(false);
    setIsAuto(isAuto);
    if (!isAuto && color) {
      setColor(color);
    }
    if (onChange) {
      onChange(isAuto ? "Auto" : color);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          className={cn(
            "w-full border border-slate-300",
            isDark(color) ? "text-slate-400" : "text-white",
            isDark(color) ? "" : "border-none",
            className
          )}
          style={{
            background: color,
          }}
        >
          {isAuto ? "Auto" : color.toUpperCase()}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={5}
          className="z-50 "
          style={{
            filter:
              "drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
          }}
        >
          <Picker
            color={color}
            isAuto={isAuto}
            onChange={handleColorChange}
            showAutoButton={showAutoButton}
          />
          {/* <SketchPicker color={color} onChange={handleColorChange} /> */}
          <Popover.Arrow className="fill-background" width={20} height={10} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

ThemeColorPicker.displayName = "ThemeColorPicker";
