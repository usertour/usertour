import { StorageKeys } from '@usertour-packages/constants';
import {
  type Theme,
  ThemeDetailPreviewType,
  type ThemeTypesSetting,
  type ThemeVariation,
  defaultSettings,
} from '@usertour/types';
import { useCurrentUserId } from '@usertour-packages/shared-hooks';
import { deepmerge } from 'deepmerge-ts';
import { useCallback, useMemo, useState } from 'react';
import { useEvent } from 'react-use';
import { BuilderProvider } from './builder-context';
import { PreviewPane } from './preview/preview-pane';
import { builderSections } from './schema/sections';
import { SectionsAccordion } from './sidebar/sections-accordion';
import { SidebarShell } from './sidebar/sidebar-shell';
import { VariationsSidebar } from './sidebar-left/variations-sidebar';
import { TopBar } from './top-bar/top-bar';
import { useResizable } from './use-resizable';
import { useThemeDraft } from './use-theme-draft';

const LEFT_SIDEBAR = { default: 320, min: 180, max: 360 };
const RIGHT_SIDEBAR = { default: 320, min: 280, max: 480 };

interface Props {
  theme: Theme;
  onBack: () => void;
  onSave: (payload: { settings: ThemeTypesSetting; variations: ThemeVariation[] }) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onActionComplete: (action: string) => void;
}

const mergeWithDefaults = (settings: ThemeTypesSetting): ThemeTypesSetting =>
  deepmerge(defaultSettings, settings) as ThemeTypesSetting;

export function ThemeBuilder({ theme, onBack, onSave, onRename, onActionComplete }: Props) {
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

  const uid = useCurrentUserId();
  // User-scoped storage keys: pre-login (uid=null) shares an unscoped slot,
  // post-login each user keeps their own preferred widths.
  const leftStorageKey = uid
    ? `${StorageKeys.THEME_BUILDER_LEFT_SIDEBAR_WIDTH}-${uid}`
    : StorageKeys.THEME_BUILDER_LEFT_SIDEBAR_WIDTH;
  const rightStorageKey = uid
    ? `${StorageKeys.THEME_BUILDER_RIGHT_SIDEBAR_WIDTH}-${uid}`
    : StorageKeys.THEME_BUILDER_RIGHT_SIDEBAR_WIDTH;
  const leftResizable = useResizable({
    storageKey: leftStorageKey,
    defaultWidth: LEFT_SIDEBAR.default,
    min: LEFT_SIDEBAR.min,
    max: LEFT_SIDEBAR.max,
    edge: 'right',
  });
  const rightResizable = useResizable({
    storageKey: rightStorageKey,
    defaultWidth: RIGHT_SIDEBAR.default,
    min: RIGHT_SIDEBAR.min,
    max: RIGHT_SIDEBAR.max,
    edge: 'left',
  });

  // Warn before closing / refreshing the tab when there are unsaved changes,
  // matching v1's theme-detail-header behavior.
  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    if (draft.hasUnsavedChanges) {
      e.preventDefault();
    }
  });

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave({ settings: draft.base, variations: draft.variations });
      draft.markSaved();
    } finally {
      setIsSaving(false);
    }
  }, [draft, onSave]);

  const builderContextValue = useMemo(
    () => ({
      activeSettings: draft.activeSettings,
      finalSettings: draft.finalSettings,
      getField: draft.getField,
      setField: draft.setField,
      isReadOnly: !!theme.isSystem,
    }),
    [draft.activeSettings, draft.finalSettings, draft.getField, draft.setField, theme.isSystem],
  );

  return (
    <BuilderProvider value={builderContextValue}>
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <TopBar
          theme={theme}
          onBack={onBack}
          onRename={onRename}
          onActionComplete={onActionComplete}
          hasUnsavedChanges={draft.hasUnsavedChanges}
          isSaving={isSaving}
          onSave={handleSave}
        />
        <div className="flex flex-1 overflow-hidden">
          <VariationsSidebar
            variations={draft.variations}
            activeVariationId={activeVariationId}
            activeVariation={draft.activeVariation}
            onSelect={setActiveVariationId}
            onAdd={onAddVariation}
            onRename={draft.renameVariation}
            onDelete={onDeleteVariation}
            onConditionsChange={(conds) => {
              if (draft.activeVariation) {
                draft.updateVariationConditions(draft.activeVariation.id, conds);
              }
            }}
            onReorder={draft.reorderVariations}
            disabled={theme.isSystem}
            width={leftResizable.width}
            resize={{
              isAtMin: leftResizable.isAtMin,
              onMouseDown: leftResizable.handleProps.onMouseDown,
            }}
          />
          <PreviewPane
            settings={draft.activeSettings}
            widgetType={activeWidgetType}
            onWidgetTypeChange={setActiveWidgetType}
          />
          <SidebarShell
            width={rightResizable.width}
            variant="right"
            resize={{
              isAtMin: rightResizable.isAtMin,
              onMouseDown: rightResizable.handleProps.onMouseDown,
            }}
          >
            <SectionsAccordion onSectionExpanded={onSectionExpanded} />
          </SidebarShell>
        </div>
      </div>
    </BuilderProvider>
  );
}
