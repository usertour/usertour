import { CloseCircleIcon } from "@usertour-ui/icons";
import { ContentActionsRemove } from "./actions-remove";
import {
  ContentActionsConditionIcon,
  ActionsConditionRightContent,
} from "./actions-template";

export interface ContentActionsDismissProps {
  data?: {
    logic: string;
    type: string;
    stepIndex: string;
  };
  type: string;
  index: number;
  text?: string;
}

export const ContentActionsDismiss = (props: ContentActionsDismissProps) => {
  const { index, text = "Dismiss flow" } = props;

  return (
    <ActionsConditionRightContent className="h-9 items-center w-fit pr-5">
      <ContentActionsConditionIcon>
        <CloseCircleIcon width={16} height={16} />
      </ContentActionsConditionIcon>
      <span className="pr-1  text-sm">{text}</span>{" "}
      <ContentActionsRemove index={index} />
    </ActionsConditionRightContent>
  );
};

ContentActionsDismiss.displayName = "ContentActionsDismiss";
