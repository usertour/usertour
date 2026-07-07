import { deepClone, extractTranslatableUnits } from '@usertour/helpers';
import type { LocalizationTranslationUnit } from '@usertour/helpers';
import type {
  AnnouncementData,
  BannerData,
  ChecklistData,
  ChecklistItemType,
  ContentEditorRoot,
  LauncherData,
  ResourceCenterBlock,
  ResourceCenterData,
  ResourceCenterTab,
} from '@usertour/types';
import { useTranslation } from 'react-i18next';

import { LocalizationGroupCard, countMissingUnits, countOutdatedPaths } from './localization-view';
import {
  LocalizedEditorContents,
  LocalizedFieldRow,
  type SlateNode,
  collectSlateLeafPairs,
  setSlateLeafText,
  toText,
} from './localized-fields';

/**
 * Per-content-type translation sections for `version.data`. Each component
 * receives the source data (read-only), its aligned working clone (holds the
 * translations, '' = untranslated) and emits a full replacement clone.
 */
export interface VersionDataSectionsProps<T> {
  sourceData: T;
  workingData: T;
  /** Flat transfer units of the whole data object, for per-card counts. */
  units: LocalizationTranslationUnit[];
  outdatedPaths: Set<string>;
  disabled: boolean;
  onDataChange: (data: T) => void;
}

const hasTranslatableTree = (contents: unknown): contents is ContentEditorRoot[] => {
  return Array.isArray(contents) && extractTranslatableUnits(contents).length > 0;
};

const asContents = (contents: unknown): ContentEditorRoot[] => {
  return Array.isArray(contents) ? (contents as ContentEditorRoot[]) : [];
};

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

const checklistGeneralMatch = (path: string) =>
  path === 'buttonText' || path.startsWith('content/');
const checklistTasksMatch = (path: string) => path.startsWith('items.');

export const ChecklistLocalizationSections = (props: VersionDataSectionsProps<ChecklistData>) => {
  const { sourceData, workingData, units, outdatedPaths, disabled, onDataChange } = props;
  const { t } = useTranslation();
  const items = Array.isArray(sourceData.items) ? sourceData.items : [];

  const handleItemChange = (itemId: string, patch: Partial<ChecklistItemType>) => {
    onDataChange({
      ...workingData,
      items: (workingData.items ?? []).map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    });
  };

  return (
    <>
      <LocalizationGroupCard
        title={t('contents.localization.section.general')}
        missingCount={countMissingUnits(units, checklistGeneralMatch)}
        outdatedCount={countOutdatedPaths(outdatedPaths, checklistGeneralMatch)}
      >
        {toText(sourceData.buttonText) !== '' && (
          <LocalizedFieldRow
            label={t('contents.localization.field.buttonText')}
            source={sourceData.buttonText}
            value={toText(workingData.buttonText)}
            placeholder={sourceData.buttonText}
            disabled={disabled}
            outdated={outdatedPaths.has('buttonText')}
            onValueChange={(value) => onDataChange({ ...workingData, buttonText: value })}
          />
        )}
        <LocalizedEditorContents
          sourceContents={asContents(sourceData.content)}
          workingContents={asContents(workingData.content)}
          outdatedElementPaths={outdatedPaths}
          outdatedPathPrefix="content"
          disabled={disabled}
          onContentsChange={(contents) => onDataChange({ ...workingData, content: contents })}
        />
      </LocalizationGroupCard>
      {items.length > 0 && (
        <LocalizationGroupCard
          title={t('contents.localization.section.tasks')}
          missingCount={countMissingUnits(units, checklistTasksMatch)}
          outdatedCount={countOutdatedPaths(outdatedPaths, checklistTasksMatch)}
        >
          {items.map((item) => {
            const workingItem = (workingData.items ?? []).find(
              (candidate) => candidate.id === item.id,
            );
            const outdated = outdatedPaths.has(`items.${item.id}`);
            return (
              <div key={item.id} className="flex flex-col gap-2">
                <LocalizedFieldRow
                  label={t('contents.localization.field.taskName')}
                  source={item.name}
                  value={toText(workingItem?.name)}
                  placeholder={item.name}
                  disabled={disabled}
                  outdated={outdated}
                  onValueChange={(value) => handleItemChange(item.id, { name: value })}
                />
                {toText(item.description) !== '' && (
                  <LocalizedFieldRow
                    label={t('contents.localization.field.taskDescription')}
                    source={toText(item.description)}
                    value={toText(workingItem?.description)}
                    placeholder={item.description}
                    disabled={disabled}
                    outdated={outdated}
                    onValueChange={(value) => handleItemChange(item.id, { description: value })}
                  />
                )}
              </div>
            );
          })}
        </LocalizationGroupCard>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Launcher
// ---------------------------------------------------------------------------

export const LauncherLocalizationSections = (props: VersionDataSectionsProps<LauncherData>) => {
  const { sourceData, workingData, units, outdatedPaths, disabled, onDataChange } = props;
  const { t } = useTranslation();

  return (
    <LocalizationGroupCard
      title={t('contents.localization.section.general')}
      missingCount={countMissingUnits(units)}
      outdatedCount={countOutdatedPaths(outdatedPaths)}
    >
      {toText(sourceData.buttonText) !== '' && (
        <LocalizedFieldRow
          label={t('contents.localization.field.buttonText')}
          source={toText(sourceData.buttonText)}
          value={toText(workingData.buttonText)}
          placeholder={sourceData.buttonText}
          disabled={disabled}
          outdated={outdatedPaths.has('buttonText')}
          onValueChange={(value) => onDataChange({ ...workingData, buttonText: value })}
        />
      )}
      <LocalizedEditorContents
        sourceContents={asContents(sourceData.tooltip?.content)}
        workingContents={asContents(workingData.tooltip?.content)}
        outdatedElementPaths={outdatedPaths}
        outdatedPathPrefix="tooltip"
        disabled={disabled}
        onContentsChange={(contents) =>
          onDataChange({
            ...workingData,
            tooltip: { ...workingData.tooltip, content: contents },
          })
        }
      />
    </LocalizationGroupCard>
  );
};

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

export const BannerLocalizationSections = (props: VersionDataSectionsProps<BannerData>) => {
  const { sourceData, workingData, units, outdatedPaths, disabled, onDataChange } = props;
  const { t } = useTranslation();

  return (
    <LocalizationGroupCard
      title={t('contents.localization.section.general')}
      missingCount={countMissingUnits(units)}
      outdatedCount={countOutdatedPaths(outdatedPaths)}
    >
      <LocalizedEditorContents
        sourceContents={asContents(sourceData.contents)}
        workingContents={asContents(workingData.contents)}
        outdatedElementPaths={outdatedPaths}
        outdatedPathPrefix="contents"
        disabled={disabled}
        onContentsChange={(contents) => onDataChange({ ...workingData, contents })}
      />
    </LocalizationGroupCard>
  );
};

// ---------------------------------------------------------------------------
// Announcement
// ---------------------------------------------------------------------------

const announcementGeneralMatch = (path: string) => path === 'title' || path === 'readMoreLabel';
const announcementIntroMatch = (path: string) => path.startsWith('introContent/');
const announcementDetailMatch = (path: string) => path.startsWith('detailContent/');

export const AnnouncementLocalizationSections = (
  props: VersionDataSectionsProps<AnnouncementData>,
) => {
  const { sourceData, workingData, units, outdatedPaths, disabled, onDataChange } = props;
  const { t } = useTranslation();

  return (
    <>
      <LocalizationGroupCard
        title={t('contents.localization.section.general')}
        missingCount={countMissingUnits(units, announcementGeneralMatch)}
        outdatedCount={countOutdatedPaths(outdatedPaths, announcementGeneralMatch)}
      >
        {toText(sourceData.title) !== '' && (
          <LocalizedFieldRow
            label={t('contents.localization.field.title')}
            source={sourceData.title}
            value={toText(workingData.title)}
            placeholder={sourceData.title}
            disabled={disabled}
            outdated={outdatedPaths.has('title')}
            onValueChange={(value) => onDataChange({ ...workingData, title: value })}
          />
        )}
        {toText(sourceData.readMoreLabel) !== '' && (
          <LocalizedFieldRow
            label={t('contents.localization.field.readMoreLabel')}
            source={sourceData.readMoreLabel}
            value={toText(workingData.readMoreLabel)}
            placeholder={sourceData.readMoreLabel}
            disabled={disabled}
            outdated={outdatedPaths.has('readMoreLabel')}
            onValueChange={(value) => onDataChange({ ...workingData, readMoreLabel: value })}
          />
        )}
      </LocalizationGroupCard>
      {hasTranslatableTree(sourceData.introContent) && (
        <LocalizationGroupCard
          title={t('contents.localization.section.introContent')}
          missingCount={countMissingUnits(units, announcementIntroMatch)}
          outdatedCount={countOutdatedPaths(outdatedPaths, announcementIntroMatch)}
        >
          <LocalizedEditorContents
            sourceContents={sourceData.introContent}
            workingContents={asContents(workingData.introContent)}
            outdatedElementPaths={outdatedPaths}
            outdatedPathPrefix="introContent"
            disabled={disabled}
            onContentsChange={(contents) =>
              onDataChange({ ...workingData, introContent: contents })
            }
          />
        </LocalizationGroupCard>
      )}
      {hasTranslatableTree(sourceData.detailContent) && (
        <LocalizationGroupCard
          title={t('contents.localization.section.detailContent')}
          missingCount={countMissingUnits(units, announcementDetailMatch)}
          outdatedCount={countOutdatedPaths(outdatedPaths, announcementDetailMatch)}
        >
          <LocalizedEditorContents
            sourceContents={sourceData.detailContent}
            workingContents={asContents(workingData.detailContent)}
            outdatedElementPaths={outdatedPaths}
            outdatedPathPrefix="detailContent"
            disabled={disabled}
            onContentsChange={(contents) =>
              onDataChange({ ...workingData, detailContent: contents })
            }
          />
        </LocalizationGroupCard>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Resource center
// ---------------------------------------------------------------------------

const resourceCenterGeneralMatch = (path: string) => path === 'buttonText' || path === 'headerText';
const createResourceCenterTabMatch = (tabId: string) => {
  // Unit paths carry a `:field` suffix; outdated element paths do not — the
  // bare `tabs.<id>` form is the tab name's outdated marker.
  const exact = `tabs.${tabId}`;
  const namePrefix = `tabs.${tabId}:`;
  const blocksPrefix = `tabs.${tabId}.`;
  return (path: string) =>
    path === exact || path.startsWith(namePrefix) || path.startsWith(blocksPrefix);
};

export const ResourceCenterLocalizationSections = (
  props: VersionDataSectionsProps<ResourceCenterData>,
) => {
  const { sourceData, workingData, units, outdatedPaths, disabled, onDataChange } = props;
  const { t } = useTranslation();
  const tabs = Array.isArray(sourceData.tabs) ? sourceData.tabs : [];

  const updateTab = (tabId: string, updateTabFn: (tab: ResourceCenterTab) => ResourceCenterTab) => {
    onDataChange({
      ...workingData,
      tabs: (workingData.tabs ?? []).map((tab) => (tab.id === tabId ? updateTabFn(tab) : tab)),
    });
  };

  const updateBlock = (
    tabId: string,
    blockId: string,
    updateBlockFn: (block: ResourceCenterBlock) => ResourceCenterBlock,
  ) => {
    updateTab(tabId, (tab) => ({
      ...tab,
      blocks: (tab.blocks ?? []).map((block) =>
        block.id === blockId ? updateBlockFn(block) : block,
      ),
    }));
  };

  return (
    <>
      <LocalizationGroupCard
        title={t('contents.localization.section.general')}
        missingCount={countMissingUnits(units, resourceCenterGeneralMatch)}
        outdatedCount={countOutdatedPaths(outdatedPaths, resourceCenterGeneralMatch)}
      >
        {toText(sourceData.buttonText) !== '' && (
          <LocalizedFieldRow
            label={t('contents.localization.field.buttonText')}
            source={sourceData.buttonText}
            value={toText(workingData.buttonText)}
            placeholder={sourceData.buttonText}
            disabled={disabled}
            outdated={outdatedPaths.has('buttonText')}
            onValueChange={(value) => onDataChange({ ...workingData, buttonText: value })}
          />
        )}
        {toText(sourceData.headerText) !== '' && (
          <LocalizedFieldRow
            label={t('contents.localization.field.headerText')}
            source={sourceData.headerText}
            value={toText(workingData.headerText)}
            placeholder={sourceData.headerText}
            disabled={disabled}
            outdated={outdatedPaths.has('headerText')}
            onValueChange={(value) => onDataChange({ ...workingData, headerText: value })}
          />
        )}
      </LocalizationGroupCard>
      {tabs.map((tab) => {
        const workingTab = (workingData.tabs ?? []).find((candidate) => candidate.id === tab.id);
        const blocks = Array.isArray(tab.blocks) ? tab.blocks : [];
        const tabMatch = createResourceCenterTabMatch(tab.id);
        return (
          <LocalizationGroupCard
            key={tab.id}
            title={tab.name}
            missingCount={countMissingUnits(units, tabMatch)}
            outdatedCount={countOutdatedPaths(outdatedPaths, tabMatch)}
          >
            {toText(tab.name) !== '' && (
              <LocalizedFieldRow
                label={t('contents.localization.field.tabName')}
                source={tab.name}
                value={toText(workingTab?.name)}
                placeholder={tab.name}
                disabled={disabled}
                outdated={outdatedPaths.has(`tabs.${tab.id}`)}
                onValueChange={(value) => updateTab(tab.id, (next) => ({ ...next, name: value }))}
              />
            )}
            {blocks.map((block) => {
              const workingBlock = (workingTab?.blocks ?? []).find(
                (candidate) => candidate.id === block.id,
              );
              const blockPath = `tabs.${tab.id}.blocks.${block.id}`;
              const sourceName = Array.isArray(block.name) ? (block.name as SlateNode[]) : null;
              const workingName =
                workingBlock && Array.isArray(workingBlock.name)
                  ? (workingBlock.name as SlateNode[])
                  : [];
              const namePairs = sourceName ? collectSlateLeafPairs(sourceName, workingName) : [];
              const sourceContent = (block as { content?: unknown }).content;
              const workingContent = (workingBlock as { content?: unknown } | undefined)?.content;
              if (namePairs.length === 0 && !hasTranslatableTree(sourceContent)) {
                return null;
              }
              return (
                <div key={block.id} className="flex flex-col gap-2">
                  {namePairs.map((pair) => (
                    <LocalizedFieldRow
                      key={pair.path.join('.')}
                      label={t('contents.localization.field.blockLabel')}
                      source={pair.sourceText}
                      value={pair.value}
                      placeholder={pair.sourceText}
                      disabled={disabled}
                      outdated={outdatedPaths.has(blockPath)}
                      onValueChange={(value) => {
                        updateBlock(tab.id, block.id, (next) => {
                          const nextName = deepClone(
                            Array.isArray(next.name) ? (next.name as SlateNode[]) : [],
                          );
                          setSlateLeafText(nextName, pair.path, value);
                          return { ...next, name: nextName } as ResourceCenterBlock;
                        });
                      }}
                    />
                  ))}
                  {Array.isArray(sourceContent) && (
                    <LocalizedEditorContents
                      sourceContents={asContents(sourceContent)}
                      workingContents={asContents(workingContent)}
                      outdatedElementPaths={outdatedPaths}
                      outdatedPathPrefix={`${blockPath}.content`}
                      disabled={disabled}
                      onContentsChange={(contents) =>
                        updateBlock(
                          tab.id,
                          block.id,
                          (next) => ({ ...next, content: contents }) as ResourceCenterBlock,
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
          </LocalizationGroupCard>
        );
      })}
    </>
  );
};
