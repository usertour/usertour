import { Input } from '@usertour/ui';

import { useBannerEditor } from '@/pages/contents/components/builder/builders/banner/use-banner-editor';

export const BannerZIndex = () => {
  const { data: localData, updateData: updateLocalData } = useBannerEditor();

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
