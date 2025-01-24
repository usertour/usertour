import { useCallback, useEffect, useState } from "react";
import reactCSS from "reactcss";
import { SketchPicker } from "react-color";
import * as Popover from "@radix-ui/react-popover";
import { getTextProps, setTextProps } from "../../lib/text";
import { useSlate } from "slate-react";

interface ColorPickerProps {
  container: HTMLElement;
}

const TYPE = "color";
const DEFAULT_COLOR = "#000000";

export const ImageToolBar = ({ container }: ColorPickerProps) => {
  const editor = useSlate();

  const handleChange = useCallback(
    (color) => {
      setTextProps(editor, "color", color.hex);
    },
    [editor]
  );

  return (
    <>
    </>
  );
};

ImageToolBar.displayName = "ImageToolBar";
