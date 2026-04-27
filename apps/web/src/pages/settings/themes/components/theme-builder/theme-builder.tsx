import {
  type Theme,
  ThemeDetailPreviewType,
  type ThemeTypesSetting,
  type ThemeVariation,
  defaultSettings,
} from '@usertour/types';
import { deepmerge } from 'deepmerge-ts';
import { useCallback, useMemo, useState } from 'react';
import { PreviewPane } from './preview/preview-pane';
import { builderSections } from './schema/sections';
import { ConditionsSection } from './sidebar/conditions-section';
import { SectionsAccordion } from './sidebar/sections-accordion';
import { SidebarShell } from './sidebar/sidebar-shell';
import { VariationsSidebar } from './sidebar-left/variations-sidebar';
import { TopBar } from './top-bar/top-bar';
import { useThemeDraft } from './use-theme-draft';

const RIGHT_SIDEBAR_WIDTH = 320;

interface Props {
  theme: Theme;
  onBack: () => void;
  onSave: (payload: { settings: ThemeTypesSetting; variations: ThemeVariation[] }) => Promise<void>;
  onAfterRename: () => void;
  onActionComplete: (action: string) => void;
}

const mergeWithDefaults = (settings: ThemeTypesSetting): ThemeTypesSetting =>
  deepmerge(defaultSettings, settings) as ThemeTypesSetting;

export function ThemeBuilder({ theme, onBack, onSave, onAfterRename, onActionComplete }: Props) {
  const [activeWidgetType, setActiveWidgetType] = useState<ThemeDetailPreviewType>(
    ThemeDetailPreviewType.TOOLTIP,
  );
  const [activeVariationId, setActiveVariationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialBase = useMemo(() => mergeWithDefaults(theme.settings), [theme.settings]);
  const initialVariations = useMemo(() => theme.variations ?? [], [theme.variations]);

  const draft = useThemeDraft({
    initialBase,
    initialVariations,
    activeVariationId,
  });

  const onSectionExpanded = useCallback((sectionId: string) => {
    const section = builderSections.find((s) => s.id === sectionId);
    if (section) setActiveWidgetType(section.previewWidget);
  }, []);

  const onAddVariation = useCallback(() => {
    if (theme.isSystem) return;
    const id = draft.addVariation();
    setActiveVariationId(id);
  }, [draft, theme.isSystem]);

  const onDeleteVariation = useCallback(
    (id: string) => {
      draft.removeVariation(id);
      if (activeVariationId === id) setActiveVariationId(null);
    },
    [draft, activeVariationId],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave({ settings: draft.base, variations: draft.variations });
      draft.markSaved();
    } finally {
      setIsSaving(false);
    }
  }, [draft, onSave]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <TopBar
        theme={theme}
        onBack={onBack}
        onAfterRename={onAfterRename}
        onActionComplete={onActionComplete}
        hasUnsavedChanges={draft.hasUnsavedChanges}
        isSaving={isSaving}
        onSave={handleSave}
      />
      <div className="flex flex-1 overflow-hidden">
        <VariationsSidebar
          variations={draft.variations}
          activeVariationId={activeVariationId}
          onSelect={setActiveVariationId}
          onAdd={onAddVariation}
          onRename={draft.renameVariation}
          onDelete={onDeleteVariation}
          disabled={theme.isSystem}
        />
        <PreviewPane
          settings={draft.activeSettings}
          widgetType={activeWidgetType}
          onWidgetTypeChange={setActiveWidgetType}
        />
        <SidebarShell width={RIGHT_SIDEBAR_WIDTH} variant="right">
          {draft.activeVariation && (
            <ConditionsSection
              conditions={draft.activeVariation.conditions}
              onConditionsChange={(conds) =>
                draft.updateVariationConditions(draft.activeVariation!.id, conds)
              }
              disabled={theme.isSystem}
            />
          )}
          <SectionsAccordion
            getField={draft.getField}
            setField={draft.setField}
            onSectionExpanded={onSectionExpanded}
          />
        </SidebarShell>
      </div>
    </div>
  );
}
