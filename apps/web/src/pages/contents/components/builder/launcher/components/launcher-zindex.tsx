import { Input } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

export const LauncherZIndex = () => {
  const { updateData: updateLocalData, data: localData } = useLauncherEditor();
  const { t } = useTranslation();

  return (
    <FieldSection title={t('contentBuilder.launcher.zIndex')}>
      <Input
        variant="compact-muted"
        className="bg-surface shadow-none"
        type="number"
        min={0}
        value={localData.zIndex ?? ''}
        placeholder={t('contentBuilder.common.default')}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          // Clamp to >= 0 (no negative z-index); 0 is treated as unset (falls
          // back to the default).
          const value = Number.isNaN(parsed) ? undefined : Math.max(0, parsed);
          updateLocalData({ zIndex: value || undefined });
        }}
      />
    </FieldSection>
  );
};

LauncherZIndex.displayName = 'LauncherZIndex';
