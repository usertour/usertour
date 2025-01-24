import { Separator } from "@usertour-ui/separator";
import { SettingsContent } from "../components/content";
import { EnvironmentListHeader } from "./components/environment-list-header";
import { EnvironmentListContent } from "./components/environment-list-content";

export const SettingsEnvironmentList = () => {
  return (
    <SettingsContent>
      <EnvironmentListHeader />
      <Separator />
      <EnvironmentListContent />
    </SettingsContent>
  );
};

SettingsEnvironmentList.displayName = "SettingsEnvironmentList";
