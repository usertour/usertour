import { Input } from '@usertour-packages/input';

import { useBannerContext } from '../../../contexts';

export const BannerZIndex = () => {
  const { updateLocalData, localData } = useBannerContext();

  if (!localData) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">Z-Index</h1>
      </div>

      <Input
        value={localData.zIndex ?? ''}
        placeholder={localData.zIndex == null ? 'Default' : undefined}
        onChange={(e) => {
          const value = Number.parseInt(e.target.value, 10);
          updateLocalData({ zIndex: Number.isNaN(value) ? undefined : value });
        }}
      />
    </div>
  );
};

BannerZIndex.displayName = 'BannerZIndex';
