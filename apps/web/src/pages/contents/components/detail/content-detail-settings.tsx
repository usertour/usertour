import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { buildConfig } from '@usertour/helpers';
import { ContentDataType, RulesCondition } from '@usertour/types';
import { useCallback } from 'react';
import {
  ContentDetailAutoStartRules,
  ContentDetailAutoStartRulesType,
} from './content-detail-autostart-rules';
import { useAppContext } from '@/contexts/app-context';
import { useContentVersionUpdate } from '@/hooks/use-content-version-update';

const getAutoStartRulesName = (contentType: ContentDataType) => {
  if (contentType === ContentDataType.BANNER) {
    return 'Show banner if...';
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return 'Show launcher if...';
  }
  if (contentType === ContentDataType.RESOURCE_CENTER) {
    return 'Show resource center if...';
  }
  if (contentType === ContentDataType.ANNOUNCEMENT) {
    return 'Only show announcement if...';
  }
  return `Auto-start ${contentType} if...`;
};

const SHOW_ONLY_CONTENT_TYPES = [
  ContentDataType.LAUNCHER,
  ContentDataType.BANNER,
  ContentDataType.RESOURCE_CENTER,
  ContentDataType.ANNOUNCEMENT,
];

const AutoStartTooltips = (contentType: ContentDataType) => {
  if (SHOW_ONLY_CONTENT_TYPES.includes(contentType)) {
    const contentLabel =
      contentType === ContentDataType.BANNER
        ? 'banner'
        : contentType === ContentDataType.RESOURCE_CENTER
          ? 'resource center'
          : contentType === ContentDataType.ANNOUNCEMENT
            ? 'announcement'
            : 'launcher';
    return (
      <>
        Show the {contentLabel} if the user matches the given condition. If the user doesn't match
        the condition, the {contentLabel} will not be displayed. Example: Show the {contentLabel} if
        the user is a new user, or set current page condition matches /* to display on all pages.{' '}
        <br />
      </>
    );
  }
  return (
    <>
      Automatically starts the {contentType} if the user matches the given condition. Example:
      Automatically start an {contentType} for all new users. <br />
      <br />
      Once the {contentType} has started, the auto-start condition has no effect, meaning if the
      user no longer matches it, the {contentType} will stay open until otherwise dismissed.
    </>
  );
};

const HideRulesTooltips = (contentType: ContentDataType) => {
  return (
    <>
      Temporarily hides the {contentType} when this condition is true. Once the condition is no
      longer true, the {contentType} may be shown again. <br />
      Example: Hide a {contentType} on certain pages.
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
  const enabledAutoStartRules = !isShowOnly;

  return (
    <div className="flex flex-col space-y-6 flex-none w-[420px]">
      <div className="px-4 py-6 space-y-3 shadow bg-white rounded-lg">
        <ContentDetailAutoStartRules
          defaultConditions={config.autoStartRules}
          defaultEnabled={config.enabledAutoStartRules}
          setting={config.autoStartRulesSetting}
          name={getAutoStartRulesName(contentType)}
          onDataChange={handleAutoStartRulesDataChange}
          content={content}
          type={ContentDetailAutoStartRulesType.START_RULES}
          showIfCompleted={!isShowOnly}
          showFrequency={!isShowOnly}
          showAtLeast={contentType !== ContentDataType.CHECKLIST}
          showWait={!isShowOnly}
          showPriority={!isShowOnly || contentType === ContentDataType.RESOURCE_CENTER}
          disabled={isViewOnly}
          featureTooltip={AutoStartTooltips(contentType)}
        />
      </div>

      {enabledAutoStartRules && (
        <div className="px-4 py-6 space-y-3 shadow bg-white rounded-lg">
          <ContentDetailAutoStartRules
            defaultConditions={config.hideRules}
            defaultEnabled={config.enabledHideRules}
            setting={config.hideRulesSetting}
            name={`Temporarily hide ${contentType} if...`}
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
        </div>
      )}
    </div>
  );
};

ContentDetailSettings.displayName = 'ContentDetailSettings';
