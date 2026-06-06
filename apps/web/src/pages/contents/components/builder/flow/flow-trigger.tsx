'use client';

import { Button, CardContent, CardFooter, CardHeader, CardTitle, ScrollArea } from '@usertour/ui';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { RiAddCircleLine, RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import { hasError } from '@usertour/helpers';
import { validateActions } from '@usertour/editor';
import { AttributeBizTypes, Attribute, RulesCondition } from '@usertour/types';
import { cuid } from '@usertour/helpers';
import { useCallback, useEffect } from 'react';
import { ContentTrigger } from '@/pages/contents/components/builder/components/content-trigger';
import {
  useBuilderConfig,
  useBuilderStore,
  useProjectId,
} from '@/pages/contents/components/builder/core';
import {
  TriggerProvider,
  useTriggerContext,
} from '@/pages/contents/components/builder/flow/trigger-context';
import { useFlowEditor } from '@/pages/contents/components/builder/flow/use-flow-editor';
import { useSeedStepFromRoute } from '@/pages/contents/components/builder/flow/use-seed-step-from-route';
import { useToken } from '@/pages/contents/components/builder/hooks/use-token';
import { useListAttributesQuery } from '@usertour/hooks';

const FlowBuilderTriggerHeader = () => {
  const currentContent = useBuilderStore((state) => state.currentContent);
  const { currentStep, currentIndex, exitToFlow } = useFlowEditor();

  return (
    <CardHeader className="flex-none space-y-2 border-b border-border/50 px-5 py-4">
      <CardTitle className="truncate pr-16 text-sm font-semibold">{currentContent?.name}</CardTitle>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={exitToFlow}
          className="mr-1.5 size-7 shrink-0 rounded-md text-slate-600 hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <div className="grow truncate text-sm font-medium leading-8">
          {currentIndex + 1}. {currentStep?.name}
        </div>
      </div>
    </CardHeader>
  );
};

const FlowBuilderTriggerBody = (props: { attributes: Attribute[]; loading: boolean }) => {
  const { attributes, loading } = props;
  const { zIndex } = useBuilderConfig();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const { currentStep, updateCurrentStep, createNewStep } = useFlowEditor();

  const { contents } = useContentList();
  const { showError, setShowError } = useTriggerContext();
  const { token } = useToken();
  const { t } = useTranslation();
  const emptyTrigger = { conditions: [], actions: [] };

  useEffect(() => {
    setShowError(false);
  }, []);

  const handleOnActionsChange = (actions: RulesCondition[], index: number) => {
    setShowError(false);
    updateCurrentStep((step) => {
      if (step.trigger?.[index]) {
        step.trigger[index].actions = [...actions];
      } else {
        step.trigger = [{ actions, conditions: [], id: cuid() }];
      }
      return step;
    });
  };

  const handleOnConditonsChange = (conditions: RulesCondition[], index: number) => {
    setShowError(false);
    updateCurrentStep((step) => {
      if (step.trigger?.[index]) {
        step.trigger[index].conditions = [...conditions];
      } else {
        step.trigger = [{ conditions, actions: [], id: cuid() }];
      }
      return step;
    });
  };

  const handleOnWaitChange = (wait: number, index: number) => {
    setShowError(false);
    updateCurrentStep((step) => {
      if (step.trigger?.[index]) {
        step.trigger[index].wait = wait;
      } else {
        step.trigger = [{ conditions: [], actions: [], wait, id: cuid() }];
      }
      return step;
    });
  };

  const handleOnClick = () => {
    updateCurrentStep((step) => {
      if (!step.trigger) {
        return { ...step, trigger: [{ ...emptyTrigger, id: cuid() }] };
      }
      return { ...step, trigger: [...step.trigger, { ...emptyTrigger, id: cuid() }] };
    });
  };

  const handleOnDelete = (index: number) => {
    updateCurrentStep((step) => {
      if (step.trigger) {
        const _trigger = [...step.trigger];
        _trigger.splice(index, 1);
        return { ...step, trigger: _trigger };
      }
      return step;
    });
  };

  return (
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-3 p-4">
          <h1 className="text-sm">{t('contentBuilder.flow.triggers')}</h1>
          {loading && (
            <div className="flex justify-center items-center h-full">
              <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading &&
            currentStep?.trigger?.map((trigger, index) => (
              <ContentTrigger
                key={trigger.id ?? index}
                showError={showError}
                attributeList={attributes}
                contents={contents}
                onActionsChange={(actions) => {
                  handleOnActionsChange(actions, index);
                }}
                onConditonsChange={(conditions) => {
                  handleOnConditonsChange(conditions, index);
                }}
                onDelete={() => {
                  handleOnDelete(index);
                }}
                zIndex={zIndex}
                currentVersion={currentVersion}
                createStep={createNewStep}
                currentStep={currentStep}
                currentContent={currentContent}
                conditions={trigger.conditions}
                actions={trigger.actions}
                token={token}
                wait={trigger.wait ?? 0}
                onWaitChange={(wait) => {
                  handleOnWaitChange(wait, index);
                }}
              />
            ))}
          <Button
            variant="ghost"
            onClick={handleOnClick}
            className="h-9 w-full rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-primary hover:bg-accent/50 hover:text-primary"
          >
            <RiAddCircleLine className="mr-2 size-4 opacity-70" />
            {t('contentBuilder.flow.addTrigger')}
          </Button>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const FlowBuilderTriggerFooter = (props: { attributes: Attribute[] }) => {
  const { attributes } = props;
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const setCurrentVersion = useBuilderStore((state) => state.setCurrentVersion);
  const { currentStep, exitToFlow } = useFlowEditor();
  const { setShowError } = useTriggerContext();
  const { t } = useTranslation();

  // Commit the edited trigger into the currentVersion draft, then return to
  // the flow overview. Auto-save (FSM) persists it — no per-step mutation,
  // no re-fetch.
  const handleSave = useCallback(() => {
    setShowError(false);
    if (!currentStep || !currentStep.id || !currentStep.trigger || !attributes) {
      return;
    }
    for (let index = 0; index < currentStep.trigger.length; index++) {
      const { actions, conditions } = currentStep.trigger[index];
      const actionFailures = validateActions(actions, {
        attributes,
        currentVersion,
        currentStep,
      });
      if (hasError(conditions, attributes)) {
        return;
      }
      // Incomplete actions: signal the outer ContentError so the trigger
      // card lights up red and the tooltip surfaces a reason — otherwise
      // Save would silent-return with no visible cue.
      if (actionFailures.length > 0) {
        setShowError(true);
        return;
      }
      if (conditions.length === 0 || actions.length === 0) {
        setShowError(true);
        return;
      }
    }
    const { trigger, cvid } = currentStep;
    setCurrentVersion((prev) => {
      if (!prev) {
        return prev;
      }
      const steps = prev.steps ?? [];
      return {
        ...prev,
        steps: steps.map((existing) =>
          existing.cvid === cvid ? { ...existing, trigger } : existing,
        ),
      };
    });
    exitToFlow();
  }, [currentStep, attributes, currentVersion, setShowError, setCurrentVersion, exitToFlow]);

  return (
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" onClick={handleSave}>
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

// Trigger-editing content. The floating panel chrome is provided by the
// persistent shell (in the flow router); this is just what goes inside it.
export const FlowBuilderTrigger = () => {
  useSeedStepFromRoute();
  const projectId = useProjectId();

  const { attributes, loading } = useListAttributesQuery(projectId, AttributeBizTypes.Nil);

  return (
    <TriggerProvider>
      <FlowBuilderTriggerHeader />
      <FlowBuilderTriggerBody attributes={attributes} loading={loading} />
      <FlowBuilderTriggerFooter attributes={attributes} />
    </TriggerProvider>
  );
};

FlowBuilderTrigger.displayName = 'FlowBuilderTrigger';
