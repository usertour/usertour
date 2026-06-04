import { Input } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useBannerEditor } from '@/pages/contents/components/builder/banner/use-banner-editor';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

export const BannerZIndex = () => {
  const { data: localData, updateData: updateLocalData } = useBannerEditor();
  const { t } = useTranslation();

  return (
    <FieldSection title={t('contentBuilder.banner.zIndex')}>
      <Input
        variant="compact-muted"
        type="number"
        min={0}
        value={localData.zIndex ?? ''}
        placeholder={t('contentBuilder.common.default')}
        onChange={(e) => {
          const parsed = Number.parseInt(e.target.value, 10);
          // Reject negative z-index; clamp to >= 0.
          updateLocalData({ zIndex: Number.isNaN(parsed) ? undefined : Math.max(0, parsed) });
        }}
      />
    </FieldSection>
  );
};

BannerZIndex.displayName = 'BannerZIndex';
