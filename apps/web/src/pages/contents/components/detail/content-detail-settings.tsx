import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useMutation } from '@apollo/client';
import { createContentVersion, updateContentVersion } from '@usertour-ui/gql';
import { defaultContentConfig, getErrorMessage } from '@usertour-ui/shared-utils';
import {
  Content,
  ContentConfigObject,
  ContentDataType,
  ContentVersion,
  RulesCondition,
} from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { deepmerge } from 'deepmerge-ts';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ContentDetailAutoStartRules,
  ContentDetailAutoStartRulesType,
} from './content-detail-autostart-rules';
import { useAppContext } from '@/contexts/app-context';
import { ContentDetailSettingsSkeleton } from './content-detail-skeleton';

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
  const {
    version,
    refetch: refetchVersion,
    setIsSaveing,
    loading: versionLoading,
  } = useContentVersionContext();
  const { content, refetch: refetchContent, loading: contentLoading } = useContentDetailContext();
  const [config, setConfig] = useState<ContentConfigObject>(buildConfig(version?.config));
  const [mutation] = useMutation(updateContentVersion);
  const [createVersion] = useMutation(createContentVersion);
  const contentRef = useRef<Content | null>(content);
  const versionRef = useRef<ContentVersion | null>(version);
  const { toast } = useToast();
  const { isViewOnly } = useAppContext();

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  const processVersion = useCallback(
    async (cfg: ContentConfigObject) => {
      const content = contentRef.current;
      const version = versionRef.current;
      if (!cfg || !version || !content) {
        return false;
      }

      try {
        if (content.published && content.publishedVersionId === version.id) {
          const { data } = await createVersion({
            variables: {
              data: {
                versionId: version.id,
                config: cfg,
              },
            },
          });
          if (data?.createContentVersion?.id) {
            await refetchContent();
            await refetchVersion();
            return true;
          }
        } else {
          const { data } = await mutation({
            variables: {
              versionId: version.id,
              content: {
                themeId: version.themeId,
                data: version.data,
                config: cfg,
              },
            },
          });
          if (data?.updateContentVersion?.id) {
            await refetchContent();
            await refetchVersion();
            return true;
          }
        }
      } catch (error) {
        console.error('Failed to process version:', error);
      }
      return false;
    },
    [createVersion, mutation, refetchContent, refetchVersion],
  );

  const updateVersion = async (cfg: ContentConfigObject) => {
    try {
      setIsSaveing(true);
      const isSuccess = await processVersion(cfg);
      setIsSaveing(false);
      if (isSuccess) {
        toast({
          variant: 'success',
          title: 'The flow updated successfully.',
        });
      }
    } catch (error) {
      setIsSaveing(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  const handleAutoStartRulesDataChange = useCallback(
    (enabled: boolean, conditions: RulesCondition[], setting: any) => {
      if (!config) {
        return;
      }
      const newConfig = {
        ...config,
        enabledAutoStartRules: enabled,
        autoStartRules: conditions,
        autoStartRulesSetting: setting,
      };
      setConfig(newConfig);
      updateVersion(newConfig);
    },
    [config],
  );

  const handleHideRulesDataChange = useCallback(
    (enabled: boolean, conditions: RulesCondition[], setting: any) => {
      if (!config) {
        return;
      }
      const newConfig = {
        ...config,
        enabledHideRules: enabled,
        hideRules: conditions,
        hideRulesSetting: setting,
      };
      setConfig(newConfig);
      updateVersion(newConfig);
    },
    [config],
  );

  // Show skeleton if any of the required data is loading
  if (versionLoading || contentLoading) {
    return <ContentDetailSettingsSkeleton />;
  }

  const contentType = content?.type;

  if (!content || !contentType) {
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
