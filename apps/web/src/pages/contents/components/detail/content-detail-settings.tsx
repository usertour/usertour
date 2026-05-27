import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { Card } from '@usertour/ui';
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
        Only users who match these conditions will see the {contentLabel}. For example, show it only
        to new users, or set the current page rule to /* to show it everywhere. <br />
      </>
    );
  }
  const label = getContentTypeLabel(contentType);
  return (
    <>
      As soon as a user matches these conditions, the {label} starts automatically. For example,
      start a {label} for every new user. <br />
      <br />
      Note: once the {label} is already running, these conditions no longer matter. Even if the user
      stops matching them, the {label} stays open until it's dismissed.
    </>
  );
};

const HideRulesTooltips = (contentType: ContentDataType) => {
  const label = getContentTypeLabel(contentType);
  return (
    <>
      Temporarily hide the {label} while these conditions are true. Once they're no longer true, it
      can show up again. <br />
      For example, hide the {label} on certain pages.
    </>
  );
};

export const ContentDetailSettings = () => {
  const { version } = useContentVersionContext();
  const { content } = useContentDetailContext();
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
