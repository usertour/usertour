import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { Card } from '@usertour/ui';
import { buildConfig, getAutoStartCapabilities } from '@usertour/helpers';
import { ContentDataType, RulesCondition } from '@usertour/types';
import { useCallback } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  ContentDetailAutoStartRules,
  ContentDetailAutoStartRulesType,
} from './content-detail-autostart-rules';
import { useAppContext } from '@/contexts/app-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { useContentVersionUpdate } from '@/hooks/use-content-version-update';
import { ElementPickerHost } from '@/components/element-picker/element-picker-host';

const getContentTypeLabel = (contentType: ContentDataType, t: TFunction): string => {
  if (contentType === ContentDataType.RESOURCE_CENTER) {
    return t('contents.overview.contentTypeLabel.resourceCenter');
  }
  if (contentType === ContentDataType.EMBED) {
    return t('contents.overview.contentTypeLabel.embed');
  }
  return contentType;
};

const getAutoStartRulesName = (contentType: ContentDataType, t: TFunction) => {
  if (contentType === ContentDataType.BANNER) {
    return t('contents.overview.autoStart.showBannerIf');
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return t('contents.overview.autoStart.showLauncherIf');
  }
  if (contentType === ContentDataType.EMBED) {
    return t('contents.overview.autoStart.showEmbedIf');
  }
  return t('contents.overview.autoStart.autoStartIf', {
    label: getContentTypeLabel(contentType, t),
  });
};

// Types whose rules gate visibility (level-triggered "show if") rather than
// starting a session once.
const SHOW_ONLY_CONTENT_TYPES = [
  ContentDataType.LAUNCHER,
  ContentDataType.BANNER,
  ContentDataType.EMBED,
];

const SHOW_ONLY_LABEL_KEY: Partial<Record<ContentDataType, string>> = {
  [ContentDataType.BANNER]: 'contents.overview.contentTypeLabel.banner',
  [ContentDataType.LAUNCHER]: 'contents.overview.contentTypeLabel.launcher',
  [ContentDataType.EMBED]: 'contents.overview.contentTypeLabel.embed',
};

const AutoStartTooltips = (contentType: ContentDataType, t: TFunction) => {
  const showOnlyLabelKey = SHOW_ONLY_LABEL_KEY[contentType];
  if (SHOW_ONLY_CONTENT_TYPES.includes(contentType) && showOnlyLabelKey) {
    return <>{t('contents.overview.autoStart.tooltipShowOnly', { label: t(showOnlyLabelKey) })}</>;
  }
  const label = getContentTypeLabel(contentType, t);
  return <>{t('contents.overview.autoStart.tooltipAutoStart', { label })}</>;
};

const HideRulesTooltips = (contentType: ContentDataType, t: TFunction) => {
  const label = getContentTypeLabel(contentType, t);
  return <>{t('contents.overview.hideRules.tooltip', { label })}</>;
};

export const ContentDetailSettings = () => {
  const { t } = useTranslation();
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);
  const { isViewOnly } = useAppContext();
  const { debouncedUpdateVersion } = useContentVersionUpdate();

  // Build config directly from version
  const config = buildConfig(version?.config, content?.type);

  const handleAutoStartRulesDataChange = useCallback(
    (enabled: boolean, conditions: RulesCondition[], setting: any) => {
      // Empty conditions = scratch state. Don't save, and also cancel any
      // pending debounced save from a prior non-empty edit — otherwise a
      // rapid-fire "delete X, delete Y, delete Z" sequence would leave
      // the queue holding the second-to-last value (e.g. [Z]), which
      // fires after the user emptied the list and resyncs server back to
      // [Z], reviving a condition the user just deleted.
      if (conditions.length === 0) {
        debouncedUpdateVersion.cancel();
        return;
      }
      const newConfig = {
        ...config,
        enabledAutoStartRules: enabled,
        autoStartRules: conditions,
        autoStartRulesSetting: setting,
      };
      debouncedUpdateVersion(newConfig);
    },
    [config, debouncedUpdateVersion],
  );

  const handleHideRulesDataChange = useCallback(
    (enabled: boolean, conditions: RulesCondition[], setting: any) => {
      // Same scratch-state policy as autoStartRules — see comment above.
      if (conditions.length === 0) {
        debouncedUpdateVersion.cancel();
        return;
      }
      const newConfig = {
        ...config,
        enabledHideRules: enabled,
        hideRules: conditions,
        hideRulesSetting: setting,
      };
      debouncedUpdateVersion(newConfig);
    },
    [config, debouncedUpdateVersion],
  );

  const contentType = content?.type;

  if (!content || !contentType || !version) {
    return null;
  }

  // Which controls this content type exposes — the shared SSOT also enforced by
  // the v2/MCP write path (see AUTO_START_CAPABILITIES in @usertour/helpers).
  const caps = getAutoStartCapabilities(contentType);

  return (
    // Element-picker host so the rule conditions' "pick element" buttons work
    // on the detail page too. No builder store here, so feed it from the
    // Apollo-cached content; a saved buildUrl flows back via the normalized
    // cache, so no onBuildUrlSaved callback is needed.
    <ElementPickerHost buildUrl={content.buildUrl} contentId={content.id}>
      <div className="flex flex-col space-y-6 flex-none w-[420px]">
        <Card className="px-4 py-6 space-y-3">
          <ContentDetailAutoStartRules
            defaultConditions={config.autoStartRules}
            defaultEnabled={config.enabledAutoStartRules}
            setting={config.autoStartRulesSetting}
            name={getAutoStartRulesName(contentType, t)}
            onDataChange={handleAutoStartRulesDataChange}
            content={content}
            type={ContentDetailAutoStartRulesType.START_RULES}
            showIfCompleted={caps.ifCompleted}
            showFrequency={caps.frequency}
            showAtLeast={caps.atLeast}
            showWait={caps.wait}
            showPriority={caps.priority}
            disabled={isViewOnly}
            featureTooltip={AutoStartTooltips(contentType, t)}
          />
        </Card>

        {caps.hideRules && (
          <Card className="px-4 py-6 space-y-3">
            <ContentDetailAutoStartRules
              defaultConditions={config.hideRules}
              defaultEnabled={config.enabledHideRules}
              setting={config.hideRulesSetting}
              name={t('contents.overview.hideRules.name', {
                label: getContentTypeLabel(contentType, t),
              })}
              onDataChange={handleHideRulesDataChange}
              content={content}
              type={ContentDetailAutoStartRulesType.HIDE_RULES}
              showWait={false}
              showFrequency={false}
              showIfCompleted={false}
              showPriority={false}
              disabled={isViewOnly}
              featureTooltip={HideRulesTooltips(contentType, t)}
            />
          </Card>
        )}
      </div>
    </ElementPickerHost>
  );
};

ContentDetailSettings.displayName = 'ContentDetailSettings';
