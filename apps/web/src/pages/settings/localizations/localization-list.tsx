import { Separator } from "@usertour-ui/separator";
import { SettingsContent } from "../components/content";
import { LocalizationListHeader } from "./components/localization-list-header";
import { LocalizationListProvider } from "@/contexts/localization-list-context";
import { useAppContext } from "@/contexts/app-context";
import { LocalizationListContent } from "./components/localization-list-content";

export const SettingsLocalizationList = () => {
  const { project } = useAppContext();
  return (
    <SettingsContent>
      <LocalizationListProvider projectId={project?.id}>
        <LocalizationListHeader />
        <Separator />
        <LocalizationListContent />
      </LocalizationListProvider>
    </SettingsContent>
  );
};

SettingsLocalizationList.displayName = "SettingsLocalizationList";
