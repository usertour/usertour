import { Separator } from "@usertour-ui/separator";
import { ThemeListProvider } from "@/contexts/theme-list-context";
import { ThemeListContent } from "./components/theme-list-content";
import { ThemeListHeader } from "./components/theme-list-header";
import { SettingsContent } from "../components/content";
import { useAppContext } from "@/contexts/app-context";

export const SettingsThemeList = () => {
  const { project } = useAppContext();

  return (
    <ThemeListProvider projectId={project?.id}>
      <SettingsContent>
        <ThemeListHeader />
        <Separator />
        <ThemeListContent />
      </SettingsContent>
    </ThemeListProvider>
  );
};

SettingsThemeList.displayName = "SettingsThemeList";
