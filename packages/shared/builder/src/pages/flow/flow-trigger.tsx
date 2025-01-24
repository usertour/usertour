"use client";

import { ChevronLeftIcon, PlusCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@usertour-ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@usertour-ui/card";
import { EXTENSION_CONTENT_SIDEBAR } from "@usertour-ui/constants";
import { ScrollArea } from "@usertour-ui/scroll-area";
import { cn, uuidV4 } from "@usertour-ui/ui-utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { BuilderMode, useBuilderContext } from "../../contexts";
import { SidebarMini } from "../sidebar/sidebar-mini";
import {
  useAttributeListContext,
  useContentListContext,
} from "@usertour-ui/contexts";
import {
  defaultStep,
  getErrorMessage,
  hasActionError,
  hasError,
} from "@usertour-ui/shared-utils";
import { SpinnerIcon } from "@usertour-ui/icons";
import { useMutation } from "@apollo/client";
import { updateContentStep } from "@usertour-ui/gql";
import { useToast } from "@usertour-ui/use-toast";
import { ContentTrigger } from "../../components/content-trigger";
import { ContentVersion, RulesCondition, Step } from "@usertour-ui/types";
import { TriggerProvider, useTriggerContext } from "../../contexts";
import { createValue1 } from "@usertour-ui/shared-editor";
import { useToken } from "../../hooks/use-token";

const FlowBuilderTriggerHeader = () => {
  const { setCurrentMode, currentStep, currentContent, currentIndex } =
    useBuilderContext();

  const handleBackup = () => {
    setCurrentMode({ mode: BuilderMode.FLOW });
  };

  return (
    <CardHeader className="flex-none p-5 space-y-2">
      <CardTitle className="text-base truncate ...">
        {currentContent?.name}
      </CardTitle>
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

const FlowBuilderTriggerBody = () => {
  const {
    zIndex,
    currentStep,
    updateCurrentStep,
    currentVersion,
    isWebBuilder,
    currentContent,
    createStep,
    setCurrentMode,
    currentMode,
    selectorOutput,
  } = useBuilderContext();

  const { contents } = useContentListContext();
  const { attributeList } = useAttributeListContext();
  const { showError, setShowError } = useTriggerContext();
  const { token } = useToken();
  const emptyTrigger = { conditions: [], actions: [] };

  useEffect(() => {
    setShowError(false);
  }, []);

  const createNewStep = (currentVersion: ContentVersion, sequence: number) => {
    const step: Step = {
      ...defaultStep,
      type: "tooltip",
      name: "Untitled",
      data: createValue1,
      sequence,
    };
    return createStep(currentVersion, step);
  };

  const handleOnActionsChange = (
    actions: RulesCondition[],
    index: number,
    hasError: boolean
  ) => {
    setShowError(false);
    updateCurrentStep((step) => {
      if (step.trigger && step.trigger[index]) {
        step.trigger[index].actions = [...actions];
      } else {
        step.trigger = [{ actions, conditions: [] }];
      }
      return step;
    });
  };

  const handleOnConditonsChange = (
    conditions: RulesCondition[],
    index: number,
    hasError: boolean
  ) => {
    setShowError(false);
    updateCurrentStep((step) => {
      if (step.trigger && step.trigger[index]) {
        step.trigger[index].conditions = [...conditions];
      } else {
        step.trigger = [{ conditions, actions: [] }];
      }
      return step;
    });
  };

  const handleOnClick = () => {
    updateCurrentStep((step) => {
      if (!step.trigger) {
        return { ...step, trigger: [emptyTrigger] };
      } else {
        return { ...step, trigger: [...step.trigger, emptyTrigger] };
      }
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
    type: string
  ) => {
    const isInput = type == "text-input" || type == "text-fill" ? true : false;
    setCurrentMode({
      mode: BuilderMode.ELEMENT_SELECTOR,
      data: { isInput },
      backMode: BuilderMode.FLOW_STEP_TRIGGER,
      triggerConditionData: { index, conditionIndex, type },
    });
  };

  useEffect(() => {
    if (
      currentMode.mode == BuilderMode.FLOW_STEP_TRIGGER &&
      selectorOutput &&
      !isWebBuilder
    ) {
      const { triggerConditionData } = currentMode;
      if (!triggerConditionData) {
        return;
      }

      const elementData = {
        precision: "loose",
        sequence: "1st",
        type: "auto",
        isDynamicContent: false,
        selectors: selectorOutput.target.selectors,
        content: selectorOutput.target.content,
        screenshot: selectorOutput.screenshot.mini,
        selectorsList: selectorOutput.target.selectorsList,
      };

      updateCurrentStep((step) => {
        if (step.trigger) {
          const trigger = [...step.trigger];
          const { index, conditionIndex, type } = triggerConditionData;
          if (!trigger[index]) {
            return step;
          }
          let conditions = [...trigger[index].conditions];
          const operators =
            conditions.length > 0 ? conditions[0].operators : "or";

          if (conditionIndex >= conditions.length) {
            conditions.push({
              type,
              operators,
              data: {
                logic: "present",
                elementData,
              },
            });
          } else {
            conditions = trigger[index].conditions.map((condition, i) => {
              if (i == conditionIndex) {
                return {
                  ...condition,
                  data: { ...condition.data, elementData },
                };
              }
              return condition;
            });
          }
          trigger[index].id = uuidV4();
          trigger[index].conditions = [...conditions];
          return { ...step, trigger };
        }
        return step;
      });
    }
  }, [currentMode, selectorOutput, isWebBuilder]);

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-3 p-4">
          <h1 className="text-sm">Triggers</h1>
          {currentStep?.trigger &&
            currentStep.trigger.map((trigger, index) => (
              <ContentTrigger
                key={trigger.id ?? index}
                showError={showError}
                attributeList={attributeList}
                contents={contents}
                onActionsChange={(actions, hasError) => {
                  handleOnActionsChange(actions, index, hasError);
                }}
                onConditonsChange={(conditions, hasError) => {
                  handleOnConditonsChange(conditions, index, hasError);
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
                onRulesConditionElementChange={
                  isWebBuilder
                    ? undefined
                    : (conditionIndex, type) => {
                        handleOnRulesConditionElementChange(
                          index,
                          conditionIndex,
                          type
                        );
                      }
                }
              />
            ))}
          <Button
            className="w-full"
            variant="secondary"
            onClick={handleOnClick}
          >
            <PlusCircledIcon className="mr-2"></PlusCircledIcon>Add trigger
          </Button>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const FlowBuilderTriggerFooter = () => {
  const {
    setCurrentMode,
    currentStep,
    fetchContentAndVersion,
    currentVersion,
  } = useBuilderContext();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [updateContentStepMutation] = useMutation(updateContentStep);
  const { toast } = useToast();
  const { attributeList } = useAttributeListContext();
  const { setShowError } = useTriggerContext();

  const handleSave = useCallback(async () => {
    setShowError(false);
    if (!currentStep || !currentStep.trigger || !attributeList) {
      return;
    }
    for (let index = 0; index < currentStep.trigger.length; index++) {
      const { actions, conditions } = currentStep.trigger[index];
      if (hasError(conditions, attributeList) || hasActionError(actions)) {
        return;
      }
      if (conditions.length == 0 || actions.length == 0) {
        setShowError(true);
        return;
      }
    }
    setIsLoading(true);
    try {
      const trigger = currentStep.trigger
        ? currentStep.trigger.map(({ id, ...updates }) => updates)
        : [];
      const ret = await updateContentStepMutation({
        variables: {
          stepId: currentStep.id,
          data: { trigger },
        },
      });
      if (ret.data.updateContentStep && currentVersion?.contentId) {
        await fetchContentAndVersion(
          currentVersion?.contentId,
          currentVersion?.id
        );
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: getErrorMessage(error),
      });
    }
    setIsLoading(false);
    setCurrentMode({ mode: BuilderMode.FLOW });
  }, [currentStep, attributeList]);

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
  const { zIndex, position } = useBuilderContext();

  return (
    <>
      <TriggerProvider>
        <div
          className={cn(
            "w-96 h-screen p-2 fixed top-0",
            position == "left" ? "left-0" : "right-0"
          )}
          style={{ zIndex: zIndex + EXTENSION_CONTENT_SIDEBAR }}
          ref={ref}
        >
          <SidebarMini container={ref} containerWidth={374} />
          <Card className="h-full flex flex-col bg-background-800">
            <FlowBuilderTriggerHeader />
            <FlowBuilderTriggerBody />
            <FlowBuilderTriggerFooter />
          </Card>
        </div>
      </TriggerProvider>
    </>
  );
};

FlowBuilderTrigger.displayName = "FlowBuilderTrigger";
