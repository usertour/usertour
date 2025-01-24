import { PagesIcon, PlusIcon, Delete2Icon } from "@usertour-ui/icons";
import { Input } from "@usertour-ui/input";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@usertour-ui/tabs";
import { ContentActionsRemove } from "./actions-remove";
import {
  ContentActionsError,
  ContentActionsErrorAnchor,
  ContentActionsErrorContent,
} from "./actions-error";
import {
  ContentActionsPopover,
  ContentActionsPopoverContent,
  ContentActionsPopoverTrigger,
} from "./actions-popper";
import {
  ContentActionsConditionIcon,
  ActionsConditionRightContent,
} from "./actions-template";
import { useActionsGroupContext } from "../contexts/actions-group-context";
import { getNavitateError } from "@usertour-ui/shared-utils";
import { useContentActionsContext } from "../contexts/content-actions-context";
import { Descendant } from "slate";
import { PopperEditorMini, serializeMini } from "../components/editor";
import { EDITOR_RICH_ACTION_CONTENT } from "@usertour-ui/constants";

export interface ContentActionsNavigateProps {
  index: number;
  type: string;
  data?: {
    openType: string;
    value: Descendant[];
  };
}

const initialValue: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "this is a text" }],
  },
];

export const ContentActionsNavigate = (props: ContentActionsNavigateProps) => {
  const { data, index } = props;
  const [openError, setOpenError] = useState(false);
  const { updateConditionData } = useActionsGroupContext();

  const { attributes, zIndex } = useContentActionsContext();
  const [errorInfo, setErrorInfo] = useState("");
  const [value, setValue] = useState(data?.value || initialValue);
  const [openType, setOpenType] = useState(data?.openType || "same");

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        const updates = {
          openType,
          value,
        };
        const { showError, errorInfo } = getNavitateError(updates);
        setOpenError(showError);
        setErrorInfo(errorInfo);
        updateConditionData(index, updates);
      }
    },
    [openType, value]
  );

  return (
    <ContentActionsError open={openError}>
      <div className="flex flex-row space-x-3">
        <ContentActionsErrorAnchor>
          <ActionsConditionRightContent>
            <ContentActionsPopover onOpenChange={handleOnOpenChange}>
              <ContentActionsPopoverTrigger className="flex flex-row items-center w-fit">
                <ContentActionsConditionIcon>
                  <PagesIcon width={16} height={16} />
                </ContentActionsConditionIcon>
                <span
                  className="break-words"
                  style={{ wordBreak: "break-word" }}
                >
                  Navigate to {value.map((v) => serializeMini(v))}
                </span>
              </ContentActionsPopoverTrigger>
              <ContentActionsPopoverContent
                style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}
              >
                <div className=" flex flex-col space-y-2">
                  <div className=" flex flex-col space-y-1">
                    <div>URL to navigate to</div>
                    <PopperEditorMini
                      zIndex={zIndex + EDITOR_RICH_ACTION_CONTENT + 1}
                      // className="w-32"
                      attributes={attributes}
                      onValueChange={setValue}
                      initialValue={value}
                    />
                    {/* <Input
                      type="text"
                      className="py-3 px-4 ps-4 pe-8 block w-full  shadow-sm rounded-lg text-sm "
                      defaultValue={value}
                      placeholder={""}
                      onChange={handleValueChange}
                    /> */}
                  </div>
                  <Tabs
                    className="w-full"
                    defaultValue={openType}
                    onValueChange={setOpenType}
                  >
                    <TabsList className="h-auto w-full	">
                      <TabsTrigger
                        value="same"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground w-1/2"
                      >
                        Same tab
                      </TabsTrigger>
                      <TabsTrigger
                        value="new"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground w-1/2"
                      >
                        New tab
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </ContentActionsPopoverContent>
            </ContentActionsPopover>
            <ContentActionsRemove index={index} />
          </ActionsConditionRightContent>
        </ContentActionsErrorAnchor>
        <ContentActionsErrorContent
          style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 3 }}
        >
          {errorInfo}
        </ContentActionsErrorContent>
      </div>
    </ContentActionsError>
  );
};

ContentActionsNavigate.displayName = "ContentActionsNavigate";
