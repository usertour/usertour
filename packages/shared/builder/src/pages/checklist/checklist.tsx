import { BuilderMode, useBuilderContext } from "../../contexts";
import { ChecklistCore } from "./checklist-core";
import { ChecklistItem } from "./checklist-item";
import { ChecklistEmbed } from "./components/checklist-embed";

export const ChecklistBuilder = () => {
  const { currentMode } = useBuilderContext();
  return (
    <>
      {currentMode.mode == BuilderMode.CHECKLIST && <ChecklistCore />}
      {currentMode.mode == BuilderMode.CHECKLIST_ITEM && <ChecklistItem />}
      <ChecklistEmbed />
    </>
  );
};

ChecklistBuilder.displayName = "ChecklistBuilder";
