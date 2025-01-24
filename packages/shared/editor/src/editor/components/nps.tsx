import { useCallback, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Label } from "@usertour-ui/label";
import { Input } from "@usertour-ui/input";
import { useContentEditorContext } from "../../contexts/content-editor-context";
import { ContentEditorNPSElement } from "../../types/editor";
import { Button } from "@usertour-ui/button";
import { ContentActions } from "../..";
import { RulesCondition } from "@usertour-ui/types";
import { QuestionTooltip } from "@usertour-ui/tooltip";

const buttonBaseClass =
  "flex items-center overflow-hidden group font-semibold relative border border-sdk-question hover:bg-sdk-question/30  rounded-md main-transition p-2 py-2 text-base justify-center";

const getScoreColor = (score: number) => {
  if (score <= 6) return "bg-red-500";
  if (score <= 8) return "bg-yellow-500";
  return "bg-green-500";
};

export const ContentEditorNPS = (props: {
  element: ContentEditorNPSElement;
  id: string;
  path: number[];
}) => {
  const { element, id, path } = props;
  const {
    updateElement,
    zIndex,
    currentStep,
    currentVersion,
    contentList,
    createStep,
    attributes,
  } = useContentEditorContext();
  const [isOpen, setIsOpen] = useState<boolean>();

  // Handle question text change
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateElement(
        {
          ...element,
          data: { ...element.data, name: e.target.value },
        },
        id
      );
    },
    [element, id]
  );

  const handleActionChange = (actions: RulesCondition[]) => {
    updateElement({ ...element, data: { ...element.data, actions } }, id);
  };

  const handleLabelChange = (value: string, type: "lowLabel" | "highLabel") => {
    updateElement({ ...element, data: { ...element.data, [type]: value } }, id);
  };

  return (
    <Popover.Root modal={true} onOpenChange={setIsOpen} open={isOpen}>
      <Popover.Trigger asChild>
        <div className="cursor-pointer">
          <div
            className="grid gap-1.5 !gap-1"
            style={{ gridTemplateColumns: "repeat(11, minmax(0px, 1fr))" }}
          >
            {Array.from({ length: 11 }, (_, i) => (
              <button key={i} className={`${buttonBaseClass}`}>
                {i}
              </button>
            ))}
          </div>
          <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
            <p>{element.data.lowLabel || "Not at all likely"}</p>
            <p>{element.data.highLabel || "Extremely likely"}</p>
          </div>
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-md border bg-background p-4"
          style={{ zIndex }}
        >
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="nps-question">Question name</Label>
            <Input
              id="nps-question"
              value={element.data.name}
              onChange={handleNameChange}
              placeholder="Question name?"
            />
            <Label>When answer is submitted</Label>
            <ContentActions
              zIndex={zIndex}
              isShowIf={false}
              isShowLogic={false}
              currentStep={currentStep}
              currentVersion={currentVersion}
              onDataChange={handleActionChange}
              defaultConditions={element?.data?.actions || []}
              attributes={attributes}
              // segments={segmentList || []}
              contents={contentList}
              createStep={createStep}
            />
            <Label className="flex items-center gap-1">
              Labels
              <QuestionTooltip>
                Below each option, provide labels to clearly convey their
                meaning, such as "Bad" positioned under the left option and
                "Good" under the right.
              </QuestionTooltip>
            </Label>
            <div className="flex flex-row gap-2">
              <Input
                type="text"
                value={element.data.lowLabel}
                placeholder="Default"
                onChange={(e) => handleLabelChange(e.target.value, "lowLabel")}
              />
              <Input
                type="text"
                value={element.data.highLabel}
                placeholder="Default"
                onChange={(e) => handleLabelChange(e.target.value, "highLabel")}
              />
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

ContentEditorNPS.displayName = "ContentEditorNPS";

export type ContentEditorNPSSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorNPSElement;
  onClick?: (element: ContentEditorNPSElement) => void;
};

export const ContentEditorNPSSerialize = (
  props: ContentEditorNPSSerializeType
) => {
  const { className, children, element, onClick } = props;

  const handleOnClick = () => {
    if (onClick) {
      onClick(element);
    }
  };
  return (
    <>
      <div className="cursor-pointer">
        <div
          className="grid gap-1.5 !gap-1"
          style={{ gridTemplateColumns: "repeat(11, minmax(0px, 1fr))" }}
        >
          {Array.from({ length: 11 }, (_, i) => (
            <button key={i} className={`${buttonBaseClass}`}>
              {i}
            </button>
          ))}
        </div>
        <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
          <p>{element.data.lowLabel || "Not at all likely"}</p>
          <p>{element.data.highLabel || "Extremely likely"}</p>
        </div>
      </div>
    </>
  );
};

ContentEditorNPSSerialize.displayName = "ContentEditorNPSSerialize";
