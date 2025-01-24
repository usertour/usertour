import { SettingsAccountDetail } from "@/pages/settings";
import { SettingsThemeList } from "@/pages/settings/themes";
import { SettingsEnvironmentList } from "@/pages/settings/environments";
import { SettingsAttributeList } from "@/pages/settings/attributes";
import { SettingsEventsList } from "@/pages/settings/events";
import { useParams } from "react-router-dom";
import { SettingsLocalizationList } from "./localizations";

export const AdminSettings = () => {
  const { settingType } = useParams();

  if (settingType === "themes") {
    return <SettingsThemeList />;
  } else if (settingType === "environments") {
    return <SettingsEnvironmentList />;
  } else if (settingType === "attributes") {
    return <SettingsAttributeList />;
  } else if (settingType === "events") {
    return <SettingsEventsList />;
  } else if (settingType === "localizations") {
    return <SettingsLocalizationList />;
  } else {
    return <SettingsAccountDetail />;
  }
};

AdminSettings.displayName = "AdminSettings";
