import { Input } from '@usertour/ui';
import { useLauncherEditor } from '../use-launcher-editor';

export const LauncherZIndex = () => {
  const { updateData: updateLocalData, data: localData } = useLauncherEditor();

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
        placeholder={!localData.zIndex ? 'Default' : undefined}
        onChange={(e) => {
          const value = Number.parseInt(e.target.value);
          updateLocalData({ zIndex: value || undefined });
        }}
      />
    </div>
  );
};

LauncherZIndex.displayName = 'LauncherZIndex';
