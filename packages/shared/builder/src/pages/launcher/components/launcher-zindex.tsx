import { Input } from '@usertour-packages/input';
import { useLauncherContext } from '../../../contexts';

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
