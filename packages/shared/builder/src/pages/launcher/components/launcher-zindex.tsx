import { useLauncherContext } from "../../../contexts";
import { Input } from "@usertour-ui/input";

export const LauncherZIndex = () => {
  const { updateLocalData, localData } = useLauncherContext();

  if (!localData) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">Z-Index</h1>
      </div>

      <Input
        value={localData.zIndex}
        placeholder={!localData.zIndex ? "Default" : undefined}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          updateLocalData({ zIndex: value || undefined });
        }}
      />
    </div>
  );
};

LauncherZIndex.displayName = "LauncherZIndex";
