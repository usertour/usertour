import { useCallback } from "react";
import { ColorResult, SketchPicker } from "react-color";
import * as Popover from "@radix-ui/react-popover";
import { getTextProps, setTextProps } from "../../lib/text";
import { useSlate } from "slate-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";

interface ColorPickerProps {
  container: HTMLElement | null;
}

const TYPE = "color";
const DEFAULT_COLOR = "#000000";

export const ColorPicker = ({ container }: ColorPickerProps) => {
  const editor = useSlate();

  const handleChange = useCallback(
    (color: ColorResult) => {
      setTextProps(editor, "color", color.hex);
    },
    [editor]
  );

  return (
    <>
      <Popover.Root>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Popover.Trigger asChild>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width={15}
                  height={15}
                  style={{ fill: getTextProps(editor, TYPE, DEFAULT_COLOR) }}
                >
                  <path d="M15.2459 14H8.75407L7.15407 18H5L11 3H13L19 18H16.8459L15.2459 14ZM14.4459 12L12 5.88516L9.55407 12H14.4459ZM3 20H21V22H3V20Z"></path>
                </svg>
              </Popover.Trigger>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Font color</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Popover.Portal container={container}>
          <Popover.Content sideOffset={5}>
            <SketchPicker
              color={getTextProps(editor, TYPE, DEFAULT_COLOR)}
              onChange={handleChange}
            />
            <Popover.Arrow className="fill-foreground" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
};

ColorPicker.displayName = "ColorPicker";
