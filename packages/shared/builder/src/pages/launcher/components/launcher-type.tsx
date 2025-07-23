import { EXTENSION_SIDEBAR_MAIN } from '@usertour-packages/constants';
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
          zIndex={sidebarZIndex}
          onChange={(value) => {
            updateLocalData({ iconType: value });
          }}
        />
      )}
    </div>
  );
};

LauncherType.displayName = 'LauncherType';
