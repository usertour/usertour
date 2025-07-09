import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { defaultContentConfig } from '@usertour-ui/shared-utils';
import { ContentConfigObject, ContentDataType, RulesCondition } from '@usertour-ui/types';
import { deepmerge } from 'deepmerge-ts';
import { useCallback } from 'react';
import {
  ContentDetailAutoStartRules,
  ContentDetailAutoStartRulesType,
} from './content-detail-autostart-rules';
import { useAppContext } from '@/contexts/app-context';
import { useContentVersionUpdate } from '@/hooks/use-content-version-update';

const buildConfig = (config: ContentConfigObject | undefined): ContentConfigObject => {
  return {
    ...defaultContentConfig,
    ...config,
    autoStartRulesSetting: deepmerge(
      defaultContentConfig.autoStartRulesSetting,
      config?.autoStartRulesSetting || {},
    ),
    hideRulesSetting: config?.hideRulesSetting || {},
  };
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

  return (
    <div className="flex flex-col space-y-6 flex-none w-[420px]">
      <ContentDetailAutoStartRules
        defaultConditions={config.autoStartRules}
        defaultEnabled={config.enabledAutoStartRules}
        setting={config.autoStartRulesSetting}
        name={`Auto-start ${contentType}`}
        onDataChange={handleAutoStartRulesDataChange}
        content={content}
        type={ContentDetailAutoStartRulesType.START_RULES}
        showIfCompleted={contentType !== ContentDataType.LAUNCHER}
        showFrequency={contentType !== ContentDataType.LAUNCHER}
        showAtLeast={contentType !== ContentDataType.CHECKLIST}
        disabled={isViewOnly}
      />
      <ContentDetailAutoStartRules
        defaultConditions={config.hideRules}
        defaultEnabled={config.enabledHideRules}
        setting={config?.hideRulesSetting}
        name={`Temporarily hide ${contentType} if...`}
        onDataChange={handleHideRulesDataChange}
        content={content}
        type={ContentDetailAutoStartRulesType.HIDE_RULES}
        showWait={false}
        showFrequency={false}
        showIfCompleted={false}
        showPriority={false}
        disabled={isViewOnly}
      />
    </div>
  );
};

ContentDetailSettings.displayName = 'ContentDetailSettings';
