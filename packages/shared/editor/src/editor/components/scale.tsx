import * as Popover from '@radix-ui/react-popover';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import { useCallback, useEffect, useState } from 'react';
import { ContentActions } from '../..';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import type { ContentEditorScaleElement } from '../../types/editor';
import { Button } from '@usertour-ui/button';
import { EditorError } from '../../components/editor-error';
import { EditorErrorContent } from '../../components/editor-error';
import { EditorErrorAnchor } from '../../components/editor-error';
import { isEmptyString } from '@usertour-ui/shared-utils';
import { BindAttribute } from './bind-attribute';
// Define Scale element type

const buttonBaseClass =
  'flex items-center overflow-hidden group relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:border-sdk-question hover:bg-sdk-question/40  rounded-md main-transition p-2 justify-center w-auto min-w-0	';

interface ContentEditorScaleProps {
  element: ContentEditorScaleElement;
  id: string;
  path: number[];
}

export const ContentEditorScale = (props: ContentEditorScaleProps) => {
  const { element, id } = props;
  const {
    updateElement,
    zIndex,
    currentStep,
    currentVersion,
    contentList,
    createStep,
    attributes,
    projectId,
  } = useContentEditorContext();
  const [isOpen, setIsOpen] = useState<boolean>();
  const [isShowError, setIsShowError] = useState<boolean>(false);
  const [localData, setLocalData] = useState(element.data);
  const [shouldUpdate, setShouldUpdate] = useState(false);

  const handleDataChange = useCallback((data: Partial<ContentEditorScaleElement['data']>) => {
    setLocalData((prevData) => {
      const newData = { ...prevData, ...data };
      setShouldUpdate(true);
      return newData;
    });
  }, []);

  useEffect(() => {
    if (shouldUpdate) {
      updateElement(
        {
          ...element,
          data: localData,
        },
        id,
      );
      setShouldUpdate(false);
    }
  }, [shouldUpdate, localData, updateElement, id]);

  useEffect(() => {
    setIsShowError(isEmptyString(localData.name));
  }, [localData.name]);

  const scaleLength = localData.highRange - localData.lowRange + 1;

  return (
    <EditorError open={isShowError}>
      <EditorErrorAnchor className="w-full">
        <Popover.Root modal={true} onOpenChange={setIsOpen} open={isOpen}>
          <Popover.Trigger asChild>
            <div className="w-full">
              <div
                className="grid gap-1.5 !gap-1"
                style={{
                  gridTemplateColumns: `repeat(${scaleLength}, minmax(0px, 1fr))`,
                }}
              >
                {Array.from({ length: scaleLength }, (_, i) => (
                  <Button key={i} className={buttonBaseClass} forSdk>
                    {Number.parseInt(localData.lowRange.toString()) + i}
                  </Button>
                ))}
              </div>
              {(localData.lowLabel || localData.highLabel) && (
                <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
                  <p>{localData.lowLabel}</p>
                  <p>{localData.highLabel}</p>
                </div>
              )}
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4"
              style={{ zIndex }}
              sideOffset={10}
              side="right"
            >
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="scale-question">Question name</Label>
                <Input
                  id="scale-question"
                  value={localData.name}
                  onChange={(e) => handleDataChange({ name: e.target.value })}
                  placeholder="Question name?"
                />
                <Label>When answer is submitted</Label>
                <ContentActions
                  zIndex={zIndex}
                  isShowIf={false}
                  isShowLogic={false}
                  currentStep={currentStep}
                  currentVersion={currentVersion}
                  onDataChange={(actions) => handleDataChange({ actions })}
                  defaultConditions={localData.actions || []}
                  attributes={attributes}
                  contents={contentList}
                  createStep={createStep}
                />
                <Label className="flex items-center gap-1">Scale range</Label>
                <div className="flex flex-row gap-2 items-center">
                  <Input
                    type="number"
                    value={localData.lowRange}
                    placeholder="Default"
                    onChange={(e) => handleDataChange({ lowRange: Number(e.target.value) })}
                  />
                  <p>-</p>
                  <Input
                    type="number"
                    value={localData.highRange}
                    placeholder="Default"
                    onChange={(e) => handleDataChange({ highRange: Number(e.target.value) })}
                  />
                </div>
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
                    value={localData.lowLabel}
                    placeholder="Default"
                    onChange={(e) => handleDataChange({ lowLabel: e.target.value })}
                  />
                  <Input
                    type="text"
                    value={localData.highLabel}
                    placeholder="Default"
                    onChange={(e) => handleDataChange({ highLabel: e.target.value })}
                  />
                </div>
                <BindAttribute
                  zIndex={zIndex}
                  bindToAttribute={localData.bindToAttribute || false}
                  selectedAttribute={localData.selectedAttribute}
                  projectId={projectId}
                  onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
                  onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
                />
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

ContentEditorScale.displayName = 'ContentEditorScale';

export type ContentEditorScaleSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorScaleElement;
  onClick?: (element: ContentEditorScaleElement, value: number) => void;
};

export const ContentEditorScaleSerialize = (props: ContentEditorScaleSerializeType) => {
  const { element, onClick } = props;

  const scaleLength = element.data.highRange - element.data.lowRange + 1;

  return (
    <>
      <div className="w-full">
        <div
          className="grid gap-1.5 !gap-1"
          style={{
            gridTemplateColumns: `repeat(${scaleLength}, minmax(0px, 1fr))`,
          }}
        >
          {Array.from({ length: scaleLength }, (_, i) => (
            <Button
              key={i}
              className={buttonBaseClass}
              forSdk
              onClick={() => onClick?.(element, element.data.lowRange + i)}
            >
              {Number.parseInt(element.data.lowRange.toString()) + i}
            </Button>
          ))}
        </div>
        {(element.data.lowLabel || element.data.highLabel) && (
          <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
            <p>{element.data.lowLabel}</p>
            <p>{element.data.highLabel}</p>
          </div>
        )}
      </div>
    </>
  );
};

ContentEditorScaleSerialize.displayName = 'ContentEditorScaleSerialize';
