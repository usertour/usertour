import * as Popover from '@radix-ui/react-popover';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import { RulesCondition } from '@usertour-ui/types';
import { useCallback, useEffect, useState } from 'react';
import { ContentActions } from '../..';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorNPSElement } from '../../types/editor';
import { Button } from '@usertour-ui/button';
import { EditorError, EditorErrorContent } from '../../components/editor-error';
import { EditorErrorAnchor } from '../../components/editor-error';
import { isEmptyString } from '@usertour-ui/shared-utils';

const buttonBaseClass =
  'flex items-center overflow-hidden group font-semibold relative border border-sdk-question hover:bg-sdk-question/30  rounded-md main-transition p-2 py-2 text-base justify-center';

interface ContentEditorNPSProps {
  element: ContentEditorNPSElement;
  id: string;
  path: number[];
}

export const ContentEditorNPS = (props: ContentEditorNPSProps) => {
  const { element, id } = props;
  const {
    updateElement,
    zIndex,
    currentStep,
    currentVersion,
    contentList,
    createStep,
    attributes,
  } = useContentEditorContext();
  const [isShowError, setIsShowError] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>();

  // Handle question text change
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateElement(
        {
          ...element,
          data: { ...element.data, name: e.target.value },
        },
        id,
      );
    },
    [element, id],
  );

  const handleActionChange = (actions: RulesCondition[]) => {
    updateElement({ ...element, data: { ...element.data, actions } }, id);
  };

  const handleLabelChange = (value: string, type: 'lowLabel' | 'highLabel') => {
    updateElement({ ...element, data: { ...element.data, [type]: value } }, id);
  };

  useEffect(() => {
    const shouldShowError = isOpen === false && isEmptyString(element.data.name);
    setIsShowError(shouldShowError);
  }, [isOpen, element?.data?.name]);

  return (
    <EditorError open={isShowError}>
      <EditorErrorAnchor>
        <Popover.Root modal={true} onOpenChange={setIsOpen} open={isOpen}>
          <Popover.Trigger asChild>
            <div className="cursor-pointer">
              <div
                className="grid gap-1.5 !gap-1"
                style={{ gridTemplateColumns: 'repeat(11, minmax(0px, 1fr))' }}
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <Button key={i} className={`${buttonBaseClass}`}>
                    {i}
                  </Button>
                ))}
              </div>
              <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
                <p>{element.data.lowLabel || 'Not at all likely'}</p>
                <p>{element.data.highLabel || 'Extremely likely'}</p>
              </div>
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4"
              style={{ zIndex }}
            >
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="nps-question">Question name</Label>
                <Input
                  id="nps-question"
                  value={element.data.name}
                  onChange={handleNameChange}
                  placeholder="Question name?"
                />
                <Label>When answer is submitted</Label>
                <ContentActions
                  zIndex={zIndex}
                  isShowIf={false}
                  isShowLogic={false}
                  currentStep={currentStep}
                  currentVersion={currentVersion}
                  onDataChange={handleActionChange}
                  defaultConditions={element?.data?.actions || []}
                  attributes={attributes}
                  // segments={segmentList || []}
                  contents={contentList}
                  createStep={createStep}
                />
                <Label className="flex items-center gap-1">
                  Labels
                  <QuestionTooltip>
                    Below each option, provide labels to clearly convey their meaning, such as "Bad"
                    positioned under the left option and "Good" under the right.
                  </QuestionTooltip>
                </Label>
                <div className="flex flex-row gap-2">
                  <Input
                    type="text"
                    value={element.data.lowLabel}
                    placeholder="Default"
                    onChange={(e) => handleLabelChange(e.target.value, 'lowLabel')}
                  />
                  <Input
                    type="text"
                    value={element.data.highLabel}
                    placeholder="Default"
                    onChange={(e) => handleLabelChange(e.target.value, 'highLabel')}
                  />
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </EditorErrorAnchor>
      <EditorErrorContent side="bottom" style={{ zIndex: zIndex }}>
        Question name is required
      </EditorErrorContent>
    </EditorError>
  );
};

ContentEditorNPS.displayName = 'ContentEditorNPS';

export type ContentEditorNPSSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorNPSElement;
  onClick?: (element: ContentEditorNPSElement) => void;
};

export const ContentEditorNPSSerialize = (props: ContentEditorNPSSerializeType) => {
  const { element } = props;

  return (
    <>
      <div className="cursor-pointer">
        <div
          className="grid gap-1.5 !gap-1"
          style={{ gridTemplateColumns: 'repeat(11, minmax(0px, 1fr))' }}
        >
          {Array.from({ length: 11 }, (_, i) => (
            <Button key={i} className={`${buttonBaseClass}`} forSdk>
              {i}
            </Button>
          ))}
        </div>
        <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
          <p>{element.data.lowLabel || 'Not at all likely'}</p>
          <p>{element.data.highLabel || 'Extremely likely'}</p>
        </div>
      </div>
    </>
  );
};

ContentEditorNPSSerialize.displayName = 'ContentEditorNPSSerialize';
