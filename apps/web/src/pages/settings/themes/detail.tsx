import { ThemeDetailHeader } from "./components/theme-detail-header";
import { useParams } from "react-router-dom";
import { ThemeDetailProvider } from "@/contexts/theme-detail-context";
import { ThemeDetailContent } from "./components/theme-detail-content";

export const SettingsThemeDetail = () => {
  const { themeId = "" } = useParams();

  return (
    <>
      <ThemeDetailProvider themeId={themeId}>
        <div className="hidden flex-col md:flex">
          <ThemeDetailHeader />
          <ThemeDetailContent />
        </div>
      </ThemeDetailProvider>
    </>
  );
};

SettingsThemeDetail.displayName = "SettingsThemeDetail";
