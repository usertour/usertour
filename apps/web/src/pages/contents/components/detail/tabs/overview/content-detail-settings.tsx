import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { Card } from '@usertour/ui';
import { buildConfig } from '@usertour/helpers';
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

const getContentTypeLabel = (contentType: ContentDataType, t: TFunction): string => {
  if (contentType === ContentDataType.RESOURCE_CENTER) {
    return t('contents.overview.contentTypeLabel.resourceCenter');
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
  return t('contents.overview.autoStart.autoStartIf', {
    label: getContentTypeLabel(contentType, t),
  });
};

const SHOW_ONLY_CONTENT_TYPES = [ContentDataType.LAUNCHER, ContentDataType.BANNER];

const AutoStartTooltips = (contentType: ContentDataType, t: TFunction) => {
  if (SHOW_ONLY_CONTENT_TYPES.includes(contentType)) {
    const contentLabel =
      contentType === ContentDataType.BANNER
        ? t('contents.overview.contentTypeLabel.banner')
        : t('contents.overview.contentTypeLabel.launcher');
    return <>{t('contents.overview.autoStart.tooltipShowOnly', { label: contentLabel })}</>;
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

  const isShowOnly = SHOW_ONLY_CONTENT_TYPES.includes(contentType);
  const isResourceCenter = contentType === ContentDataType.RESOURCE_CENTER;
  // Flow / Checklist show the full advanced rule options; RC uses auto-start semantics but
  // intentionally keeps the advanced options hidden.
  const showAdvancedOptions = !isShowOnly && !isResourceCenter;
  const enabledAutoStartRules = !isShowOnly;

  return (
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
          showIfCompleted={showAdvancedOptions}
          showFrequency={showAdvancedOptions}
          showAtLeast={contentType !== ContentDataType.CHECKLIST}
          showWait={showAdvancedOptions}
          showPriority={showAdvancedOptions || isResourceCenter}
          disabled={isViewOnly}
          featureTooltip={AutoStartTooltips(contentType, t)}
        />
      </Card>

      {enabledAutoStartRules && (
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
  );
};

ContentDetailSettings.displayName = 'ContentDetailSettings';
