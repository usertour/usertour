import { EXTENSION_SIDEBAR_MAIN } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { LauncherDataType } from '@usertour/types';
import { LauncherContentType, LauncherIconType } from '../../../components/';
import { useLauncherContext } from '../../../contexts';

export const LauncherType = () => {
  const { updateLocalData, zIndex, localData } = useLauncherContext();
  const sidebarZIndex = zIndex + EXTENSION_SIDEBAR_MAIN;

  if (!localData) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">Appearance</h1>
      </div>

      <LauncherContentType
        type={localData.type}
        zIndex={sidebarZIndex}
        onChange={(value) => {
          updateLocalData({ type: value });
        }}
      />

      {localData.type === LauncherDataType.ICON && (
        <LauncherIconType
          type={localData.iconType}
          iconSource={localData.iconSource}
          iconUrl={localData.iconUrl}
          zIndex={sidebarZIndex}
          onChange={(updates) => {
            updateLocalData(updates);
          }}
        />
      )}

      {localData.type === LauncherDataType.BUTTON && (
        <Input
          value={localData.buttonText ?? ''}
          placeholder="Button text"
          onChange={(e) => {
            updateLocalData({ buttonText: e.target.value || undefined });
          }}
        />
      )}
    </div>
  );
};

LauncherType.displayName = 'LauncherType';
