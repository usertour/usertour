import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { Card } from '@usertour-packages/card';
import { buildConfig } from '@usertour/helpers';
import { ContentDataType, RulesCondition } from '@usertour/types';
import { useCallback } from 'react';
import {
  ContentDetailAutoStartRules,
  ContentDetailAutoStartRulesType,
} from './content-detail-autostart-rules';
import { useAppContext } from '@/contexts/app-context';
import { useContentVersionUpdate } from '@/hooks/use-content-version-update';

const getContentTypeLabel = (contentType: ContentDataType): string => {
  if (contentType === ContentDataType.RESOURCE_CENTER) return 'resource center';
  return contentType;
};

const getAutoStartRulesName = (contentType: ContentDataType) => {
  if (contentType === ContentDataType.BANNER) {
    return 'Show banner if...';
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return 'Show launcher if...';
  }
  return `Auto-start ${getContentTypeLabel(contentType)} if...`;
};

const SHOW_ONLY_CONTENT_TYPES = [ContentDataType.LAUNCHER, ContentDataType.BANNER];

const AutoStartTooltips = (contentType: ContentDataType) => {
  if (SHOW_ONLY_CONTENT_TYPES.includes(contentType)) {
    const contentLabel = contentType === ContentDataType.BANNER ? 'banner' : 'launcher';
    return (
      <>
        Show the {contentLabel} if the user matches the given condition. If the user doesn't match
        the condition, the {contentLabel} will not be displayed. Example: Show the {contentLabel} if
        the user is a new user, or set current page condition matches /* to display on all pages.{' '}
        <br />
      </>
    );
  }
  const label = getContentTypeLabel(contentType);
  return (
    <>
      Automatically starts the {label} if the user matches the given condition. Example:
      Automatically start a {label} for all new users. <br />
      <br />
      Once the {label} has started, the auto-start condition has no effect, meaning if the user no
      longer matches it, the {label} will stay open until otherwise dismissed.
    </>
  );
};

const HideRulesTooltips = (contentType: ContentDataType) => {
  const label = getContentTypeLabel(contentType);
  return (
    <>
      Temporarily hides the {label} when this condition is true. Once the condition is no longer
      true, the {label} may be shown again. <br />
      Example: Hide a {label} on certain pages.
    </>
  );
};

export const ContentDetailSettings = () => {
  const { version } = useContentVersionContext();
  const { content } = useContentDetailContext();
  const { isViewOnly } = useAppContext();
  const { debouncedUpdateVersion } = useContentVersionUpdate();

  // Build config directly from version
  const config = buildConfig(version?.config);

  const handleAutoStartRulesDataChange = useCallback(
    (enabled: boolean, conditions: RulesCondition[], setting: any) => {
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
          name={getAutoStartRulesName(contentType)}
          onDataChange={handleAutoStartRulesDataChange}
          content={content}
          type={ContentDetailAutoStartRulesType.START_RULES}
          showIfCompleted={showAdvancedOptions}
          showFrequency={showAdvancedOptions}
          showAtLeast={contentType !== ContentDataType.CHECKLIST}
          showWait={showAdvancedOptions}
          showPriority={showAdvancedOptions || isResourceCenter}
          disabled={isViewOnly}
          featureTooltip={AutoStartTooltips(contentType)}
        />
      </Card>

      {enabledAutoStartRules && (
        <Card className="px-4 py-6 space-y-3">
          <ContentDetailAutoStartRules
            defaultConditions={config.hideRules}
            defaultEnabled={config.enabledHideRules}
            setting={config.hideRulesSetting}
            name={`Temporarily hide ${getContentTypeLabel(contentType)} if...`}
            onDataChange={handleHideRulesDataChange}
            content={content}
            type={ContentDetailAutoStartRulesType.HIDE_RULES}
            showWait={false}
            showFrequency={false}
            showIfCompleted={false}
            showPriority={false}
            disabled={isViewOnly}
            featureTooltip={HideRulesTooltips(contentType)}
          />
        </Card>
      )}
    </div>
  );
};

ContentDetailSettings.displayName = 'ContentDetailSettings';
