import { Button } from '@usertour-packages/button';
import { EXTENSION_CONTENT_RULES, EXTENSION_SELECT } from '@usertour-packages/constants';
import { Delete2Icon } from '@usertour-packages/icons';
import { Label } from '@usertour-packages/label';
import { Rules, RulesWait } from '@usertour-packages/shared-components';
import { defaultRulesItems } from '@usertour-packages/shared-components/src/components/rules';
import { ContentActions } from '@usertour-packages/shared-editor';
import { Attribute, Content, ContentVersion, RulesCondition, Step } from '@usertour/types';
import { ContentError, ContentErrorAnchor, ContentErrorContent } from './content-error';

interface ContentTriggerProps {
  actions: RulesCondition[];
  conditions: RulesCondition[];
  attributeList: Attribute[] | undefined;
  currentVersion: ContentVersion | undefined;
  currentContent: Content | undefined;
  zIndex: number;
  contents: Content[];
  currentStep: Step;
  token: string;
  showError: boolean;
  wait: number;
  onActionsChange: (actions: RulesCondition[], hasError: boolean) => void;
  onConditonsChange: (conds: RulesCondition[], hasError: boolean) => void;
  onDelete: () => void;
  createStep?: (currentVersion: ContentVersion, sequence: number) => Promise<Step | undefined>;
  onRulesConditionElementChange?: (conditionIndex: number, type: string) => void;
  onWaitChange: (wait: number) => void;
}

export const ContentTrigger = (props: ContentTriggerProps) => {
  const {
    actions,
    attributeList,
    currentVersion,
    zIndex,
    contents,
    conditions,
    token,
    onActionsChange,
    onConditonsChange,
    currentStep,
    createStep,
    onDelete,
    currentContent,
    showError,
    onRulesConditionElementChange,
    onWaitChange,
    wait,
  } = props;

  return (
    <>
      <div className="flex flex-col border shadow p-2 rounded-lg space-y-4 relative">
        <ContentError open={showError && (actions.length === 0 || conditions.length === 0)}>
          <ContentErrorAnchor>
            <Rules
              onDataChange={onConditonsChange}
              defaultConditions={conditions}
              attributes={attributeList}
              contents={contents}
              currentContent={currentContent}
              token={token}
              filterItems={defaultRulesItems.filter(
                (item) => item !== 'segment' && item !== 'content',
              )}
              onElementChange={onRulesConditionElementChange}
              baseZIndex={EXTENSION_CONTENT_RULES}
            />
            <RulesWait
              defaultValue={wait}
              onValueChange={onWaitChange}
              disabled={false}
              baseZIndex={EXTENSION_CONTENT_RULES}
            />
            <Label>Action to perform when triggered</Label>
            <ContentActions
              zIndex={zIndex + EXTENSION_SELECT}
              isShowIf={false}
              isShowLogic={false}
              currentStep={currentStep}
              currentVersion={currentVersion}
              onDataChange={onActionsChange}
              defaultConditions={actions}
              attributes={attributeList}
              contents={contents}
              createStep={createStep}
            />
          </ContentErrorAnchor>
          <ContentErrorContent
            style={{
              zIndex: EXTENSION_CONTENT_RULES,
            }}
          >
            {conditions.length === 0 && 'please add at least 1 conditon'}
            {conditions.length > 0 && actions.length === 0 && 'please add at least 1 action'}
          </ContentErrorContent>
        </ContentError>
        <Button
          className="flex-none hover:bg-destructive/20 absolute right-1 bottom-1 text-destructive hover:text-destructive"
          variant="ghost"
          size={'sm'}
          onClick={onDelete}
        >
          <Delete2Icon className="text-destructive mr-1 size-3.5	" />
          Delete trigger
        </Button>
      </div>
    </>
  );
};
ContentTrigger.displayName = 'ContentTrigger';
