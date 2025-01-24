import * as SharedPopper from "@usertour-ui/sdk";
import { convertSettings, convertToCssVars } from "@usertour-ui/shared-utils";
import { Button } from "@usertour-ui/button";
import { useRef, useState } from "react";
import { defaultSettings, ThemeTypesSetting } from "@usertour-ui/types";
import {
  ContentEditorSerialize,
  serializeData,
} from "@usertour-ui/shared-editor";

type CreatePopperContentProps = {
  text: string;
  data: any;
  type: string;
  key: number;
  settings: ThemeTypesSetting;
  onClick: (type: string, data: string) => void;
  width: string;
  height: string;
  scale: number;
};

export const PopperPreview = (props: CreatePopperContentProps) => {
  const {
    width,
    height,
    text,
    data,
    type,
    onClick,
    settings = defaultSettings,
    scale = 1,
  } = props;
  const handleOnClick = () => {
    onClick(type, data);
  };
  const ref = useRef(null);
  // const serialize = data ? serializeData(JSON.parse(data)) : [];
  return (
    <div
      className="rounded-lg bg-background-700 w-52 h-52 flex flex-col cursor-pointer"
      onClick={handleOnClick}
    >
      <div
        className="flex-none justify-center flex flex-col items-center h-44	"
        // style={{ transform: `scale(${scale})` }}
      >
        <SharedPopper.Popper
          triggerRef={ref}
          open={true}
          zIndex={1111}
          globalStyle={convertToCssVars(convertSettings(defaultSettings))}
        >
          <SharedPopper.PopperStaticContent
            arrowSize={{
              width: 20,
              height: 10,
            }}
            customStyle={{ zoom: scale }}
            side="bottom"
            showArrow={type == "tooltip" ? true : false}
            width={width}
            height={height}
            arrowColor={defaultSettings?.mainColor.background}
          >
            <SharedPopper.PopperClose />
            {/* {...serialize} */}
            <ContentEditorSerialize contents={data}></ContentEditorSerialize>
          </SharedPopper.PopperStaticContent>
        </SharedPopper.Popper>
      </div>
      <div className="bg-background-400 flex-none leading-8 text-foreground text-center rounded-b-lg">
        {text}
      </div>
    </div>
  );
};

PopperPreview.displayName = "PopperPreview";
