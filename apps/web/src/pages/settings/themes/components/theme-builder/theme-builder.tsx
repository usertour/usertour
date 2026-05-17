import { useAppContext } from '@/contexts/app-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { StorageKeys } from '@usertour/constants';
import { validateConditions } from '@usertour/business-components';
import {
  type Theme,
  ThemeDetailPreviewType,
  type ThemeTypesSetting,
  type ThemeVariation,
  defaultSettings,
} from '@usertour/types';
import { useCurrentUserId } from '@usertour/hooks';
import { useToast } from '@usertour/use-toast';
import { getErrorMessage } from '@usertour/helpers';
import { deepmerge } from 'deepmerge-ts';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvent } from 'react-use';
import { CompactPanel } from '@usertour/ui';
import { BuilderProvider } from './builder-context';
import { PreviewPane } from './preview/preview-pane';
import { builderSections } from './schema/sections';
import { SectionsAccordion } from './sidebar/sections-accordion';
import { VariationsSidebar } from './sidebar-left/variations-sidebar';
import { TopBar } from './top-bar/top-bar';
import { useResizable } from './use-resizable';
import { useThemeDraft } from './use-theme-draft';

const LEFT_SIDEBAR = { default: 280, min: 180, max: 360 };
const RIGHT_SIDEBAR = { default: 320, min: 280, max: 480 };

interface Props {
  theme: Theme;
  onSave: (payload: { settings: ThemeTypesSetting; variations: ThemeVariation[] }) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onActionComplete: (action: string) => void;
}

const mergeWithDefaults = (settings: ThemeTypesSetting): ThemeTypesSetting =>
  deepmerge(defaultSettings, settings) as ThemeTypesSetting;

export function ThemeBuilder({ theme, onSave, onRename, onActionComplete }: Props) {
  const [activeWidgetType, setActiveWidgetType] = useState<ThemeDetailPreviewType>(
    ThemeDetailPreviewType.TOOLTIP,
  );
  const [activeVariationId, setActiveVariationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { isViewOnly } = useAppContext();
  // Read-only when the theme itself is a system preset OR when the
  // current viewer holds the Viewer role. Both gate every write surface
  // (setField, save, rename, variation add/remove/reorder).
  const isReadOnly = !!theme.isSystem || isViewOnly;

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
    if (isReadOnly) return;
    const id = draft.addVariation();
    setActiveVariationId(id);
  }, [draft, isReadOnly]);

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

  // Warn before closing / refreshing the tab when there are unsaved changes.
  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    if (draft.hasUnsavedChanges) {
      e.preventDefault();
    }
  });

  const { toast } = useToast();
  const { t } = useTranslation();
  const { attributeList } = useAttributeListContext();
  const handleSave = useCallback(async () => {
    // Conditions writes every onChange — including the one fired when a
    // user adds a fresh empty user-attr / current-page from the dropdown
    // — straight through to draft.variations. Block save when any of
    // those drafted conditions still fail validation; ConditionRow's
    // inline error tooltip already flags which row needs attention, so
    // the toast here just tells the user why save was rejected.
    const invalidVariation = draft.variations.find(
      (v) => validateConditions(v.conditions ?? [], { attributes: attributeList ?? [] }).length > 0,
    );
    if (invalidVariation) {
      toast({
        variant: 'destructive',
        title: t('themeBuilder.validation.invalidVariation', {
          name: invalidVariation.name || t('themeBuilder.chrome.thisVariation'),
        }),
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ settings: draft.base, variations: draft.variations });
      draft.markSaved();
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  }, [attributeList, draft, onSave, t, toast]);

  const builderContextValue = useMemo(
    () => ({
      activeSettings: draft.activeSettings,
      finalSettings: draft.finalSettings,
      getField: draft.getField,
      setField: draft.setField,
      isReadOnly,
    }),
    [draft.activeSettings, draft.finalSettings, draft.getField, draft.setField, isReadOnly],
  );

  return (
    <BuilderProvider value={builderContextValue}>
      {/* AdminShellMuted's content card is `flex h-full w-full` (flex-row);
          we stack TopBar + 3-column body vertically and let the inner panes
          own their own scroll. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <TopBar
          theme={theme}
          onRename={onRename}
          onActionComplete={onActionComplete}
          hasUnsavedChanges={draft.hasUnsavedChanges}
          isSaving={isSaving}
          onSave={handleSave}
          isReadOnly={isReadOnly}
          isViewOnly={isViewOnly}
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
            disabled={isReadOnly}
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
          <CompactPanel
            width={rightResizable.width}
            variant="right"
            resize={{
              isAtMin: rightResizable.isAtMin,
              onMouseDown: rightResizable.handleProps.onMouseDown,
              ariaLabel: t('themeBuilder.aria.resizeSidebar'),
            }}
          >
            <SectionsAccordion onSectionExpanded={onSectionExpanded} />
          </CompactPanel>
        </div>
      </div>
    </BuilderProvider>
  );
}
