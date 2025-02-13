import { GearIcon } from '@radix-ui/react-icons';
import { ElementIcon } from '@usertour-ui/icons';
import { useLauncherContext } from '../../../contexts';

export const LauncherTargetPreview = () => {
  const { gotoLauncherTarget } = useLauncherContext();

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">Target</h1>
      </div>

      <div
        className="flex flex-row items-center justify-between cursor-pointer bg-background-700 p-3.5 rounded-lg"
        onClick={gotoLauncherTarget}
      >
        <div className="flex flex-row space-x-1 items-center">
          <ElementIcon className="h-4 w-4" />
          <span className="text-sm">Target setting</span>
        </div>
        <GearIcon className="h-4 w-4" />
      </div>
    </div>
  );
};

LauncherTargetPreview.displayName = 'LauncherTargetPreview';
