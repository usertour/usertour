import { deepClone, extractTranslatableUnits } from '@usertour/helpers';
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
import { Card } from '@usertour/ui';
import { useTranslation } from 'react-i18next';

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

export const ChecklistLocalizationSections = (props: VersionDataSectionsProps<ChecklistData>) => {
  const { sourceData, workingData, outdatedPaths, disabled, onDataChange } = props;
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
      <Card className="flex flex-col space-y-4 p-4">
        <div className="font-medium">{t('contents.localization.section.general')}</div>
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
      </Card>
      {items.length > 0 && (
        <Card className="flex flex-col space-y-4 p-4">
          <div className="font-medium">{t('contents.localization.section.tasks')}</div>
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
                    source={item.description}
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
        </Card>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Launcher
// ---------------------------------------------------------------------------

export const LauncherLocalizationSections = (props: VersionDataSectionsProps<LauncherData>) => {
  const { sourceData, workingData, outdatedPaths, disabled, onDataChange } = props;
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col space-y-4 p-4">
      <div className="font-medium">{t('contents.localization.section.general')}</div>
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
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

export const BannerLocalizationSections = (props: VersionDataSectionsProps<BannerData>) => {
  const { sourceData, workingData, outdatedPaths, disabled, onDataChange } = props;
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col space-y-4 p-4">
      <div className="font-medium">{t('contents.localization.section.general')}</div>
      <LocalizedEditorContents
        sourceContents={asContents(sourceData.contents)}
        workingContents={asContents(workingData.contents)}
        outdatedElementPaths={outdatedPaths}
        outdatedPathPrefix="contents"
        disabled={disabled}
        onContentsChange={(contents) => onDataChange({ ...workingData, contents })}
      />
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Announcement
// ---------------------------------------------------------------------------

export const AnnouncementLocalizationSections = (
  props: VersionDataSectionsProps<AnnouncementData>,
) => {
  const { sourceData, workingData, outdatedPaths, disabled, onDataChange } = props;
  const { t } = useTranslation();

  return (
    <>
      <Card className="flex flex-col space-y-4 p-4">
        <div className="font-medium">{t('contents.localization.section.general')}</div>
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
      </Card>
      {hasTranslatableTree(sourceData.introContent) && (
        <Card className="flex flex-col space-y-4 p-4">
          <div className="font-medium">{t('contents.localization.section.introContent')}</div>
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
        </Card>
      )}
      {hasTranslatableTree(sourceData.detailContent) && (
        <Card className="flex flex-col space-y-4 p-4">
          <div className="font-medium">{t('contents.localization.section.detailContent')}</div>
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
        </Card>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Resource center
// ---------------------------------------------------------------------------

export const ResourceCenterLocalizationSections = (
  props: VersionDataSectionsProps<ResourceCenterData>,
) => {
  const { sourceData, workingData, outdatedPaths, disabled, onDataChange } = props;
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
      <Card className="flex flex-col space-y-4 p-4">
        <div className="font-medium">{t('contents.localization.section.general')}</div>
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
      </Card>
      {tabs.map((tab) => {
        const workingTab = (workingData.tabs ?? []).find((candidate) => candidate.id === tab.id);
        const blocks = Array.isArray(tab.blocks) ? tab.blocks : [];
        return (
          <Card key={tab.id} className="flex flex-col space-y-4 p-4">
            <div className="font-medium">{tab.name}</div>
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
          </Card>
        );
      })}
    </>
  );
};
