'use client';

import { useMutation } from '@apollo/client';
import { ChevronLeftIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_CONTENT_SIDEBAR } from '@usertour-packages/constants';
import { useContentListContext } from '@usertour-packages/contexts';
import { updateContentStep } from '@usertour-packages/gql';
import { SpinnerIcon } from '@usertour-packages/icons';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { createValue1 } from '@usertour-packages/shared-editor';
import { defaultStep, getErrorMessage, hasActionError, hasError } from '@usertour/helpers';
import {
  AttributeBizTypes,
  Attribute,
  ContentVersion,
  RulesCondition,
  Step,
} from '@usertour/types';
import { cn, cuid } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ContentTrigger } from '../../components/content-trigger';
import { BuilderMode, useBuilderContext } from '../../contexts';
import { TriggerProvider, useTriggerContext } from '../../contexts';
import { useToken } from '../../hooks/use-token';
import { SidebarMini } from '../sidebar/sidebar-mini';
import { useListAttributesQuery } from '@usertour-packages/shared-hooks';

const FlowBuilderTriggerHeader = () => {
  const { setCurrentMode, currentStep, currentContent, currentIndex } = useBuilderContext();

  const handleBackup = () => {
    setCurrentMode({ mode: BuilderMode.FLOW });
  };

  return (
    <CardHeader className="flex-none p-5 space-y-2">
      <CardTitle className="text-base truncate ...">{currentContent?.name}</CardTitle>
      <div className="flex">
        <Button
          variant="link"
          size="icon"
          onClick={handleBackup}
          className="mr-2 text-foreground w-6 h-8"
        >
          <ChevronLeftIcon className="h-6 w-6 " />
        </Button>
        <div className="grow text-base leading-8 truncate ...">
          {currentIndex + 1}、{currentStep?.name}
        </div>
      </div>
    </CardHeader>
  );
};

const FlowBuilderTriggerBody = (props: { attributes: Attribute[]; loading: boolean }) => {
  const { attributes, loading } = props;
  const {
    zIndex,
    currentStep,
    updateCurrentStep,
    currentVersion,
    isWebBuilder,
    currentContent,
    createStep,
    setCurrentMode,
  } = useBuilderContext();

  const { contents } = useContentListContext();
  const { showError, setShowError } = useTriggerContext();
  const { token } = useToken();
  const emptyTrigger = { conditions: [], actions: [] };

  useEffect(() => {
    setShowError(false);
  }, []);

  const createNewStep = (currentVersion: ContentVersion, sequence: number) => {
    const step: Step = {
      ...defaultStep,
      type: 'tooltip',
      name: 'Untitled',
      data: createValue1,
      sequence,
    };
    return createStep(currentVersion, step);
  };

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

  const handleOnRulesConditionElementChange = (
    index: number,
    conditionIndex: number,
    type: string,
  ) => {
    const isInput = type === 'text-input' || type === 'text-fill';
    setCurrentMode({
      mode: BuilderMode.ELEMENT_SELECTOR,
      data: { isInput },
      backMode: BuilderMode.FLOW_STEP_TRIGGER,
      triggerConditionData: { index, conditionIndex, type },
    });
  };

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-3 p-4">
          <h1 className="text-sm">Triggers</h1>
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
                onRulesConditionElementChange={
                  isWebBuilder
                    ? undefined
                    : (conditionIndex, type) => {
                        handleOnRulesConditionElementChange(index, conditionIndex, type);
                      }
                }
              />
            ))}
          <Button className="w-full" variant="secondary" onClick={handleOnClick}>
            <PlusCircledIcon className="mr-2" />
            Add trigger
          </Button>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const FlowBuilderTriggerFooter = (props: { attributes: Attribute[] }) => {
  const { attributes } = props;
  const { setCurrentMode, currentStep, fetchContentAndVersion, currentVersion } =
    useBuilderContext();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [updateContentStepMutation] = useMutation(updateContentStep);
  const { toast } = useToast();
  const { setShowError } = useTriggerContext();

  const handleSave = useCallback(async () => {
    setShowError(false);
    if (!currentStep || !currentStep.trigger || !attributes) {
      return;
    }
    for (let index = 0; index < currentStep.trigger.length; index++) {
      const { actions, conditions } = currentStep.trigger[index];
      if (hasError(conditions, attributes) || hasActionError(actions)) {
        return;
      }
      if (conditions.length === 0 || actions.length === 0) {
        setShowError(true);
        return;
      }
    }
    setIsLoading(true);
    try {
      const trigger = currentStep?.trigger || [];
      const ret = await updateContentStepMutation({
        variables: {
          stepId: currentStep.id,
          data: { trigger },
        },
      });
      if (ret.data.updateContentStep && currentVersion?.contentId) {
        await fetchContentAndVersion(currentVersion?.contentId, currentVersion?.id);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
    setIsLoading(false);
    setCurrentMode({ mode: BuilderMode.FLOW });
  }, [currentStep, attributes]);

  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" disabled={isLoading} onClick={handleSave}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </CardFooter>
  );
};

export const FlowBuilderTrigger = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { zIndex, position, projectId } = useBuilderContext();

  const { attributes, loading } = useListAttributesQuery(projectId, AttributeBizTypes.Nil);

  return (
    <>
      <TriggerProvider>
        <div
          className={cn(
            'w-96 h-screen p-2 fixed top-0',
            position === 'left' ? 'left-0' : 'right-0',
          )}
          style={{ zIndex: zIndex + EXTENSION_CONTENT_SIDEBAR }}
          ref={ref}
        >
          <SidebarMini container={ref} containerWidth={374} />
          <Card className="h-full flex flex-col bg-background-800">
            <FlowBuilderTriggerHeader />
            <FlowBuilderTriggerBody attributes={attributes} loading={loading} />
            <FlowBuilderTriggerFooter attributes={attributes} />
          </Card>
        </div>
      </TriggerProvider>
    </>
  );
};

FlowBuilderTrigger.displayName = 'FlowBuilderTrigger';
