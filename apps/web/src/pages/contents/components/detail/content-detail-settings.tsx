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
  if (contentType === ContentDataType.LAUNCHER) {
    return 'Show launcher if...';
  }
  return `Auto-start ${contentType} if...`;
};

const AutoStartTooltips = (contentType: ContentDataType) => {
  if (contentType === ContentDataType.LAUNCHER) {
    return (
      <>
        Show the launcher if the user matches the given condition. If the user doesn't match the
        condition, the launcher will not be displayed. Example: Show the launcher if the user is a
        new user. <br />
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

  const enabledAutoStartRules = contentType !== ContentDataType.LAUNCHER;

  return (
    <div className="flex flex-col space-y-6 flex-none w-[420px]">
      <ContentDetailAutoStartRules
        defaultConditions={config.autoStartRules}
        defaultEnabled={config.enabledAutoStartRules}
        setting={config.autoStartRulesSetting}
        name={getAutoStartRulesName(contentType)}
        onDataChange={handleAutoStartRulesDataChange}
        content={content}
        type={ContentDetailAutoStartRulesType.START_RULES}
        showIfCompleted={contentType !== ContentDataType.LAUNCHER}
        showFrequency={contentType !== ContentDataType.LAUNCHER}
        showAtLeast={contentType !== ContentDataType.CHECKLIST}
        showWait={contentType !== ContentDataType.LAUNCHER}
        showPriority={contentType !== ContentDataType.LAUNCHER}
        disabled={isViewOnly}
        featureTooltip={AutoStartTooltips(contentType)}
      />

      {enabledAutoStartRules && (
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
      )}
    </div>
  );
};

ContentDetailSettings.displayName = 'ContentDetailSettings';
