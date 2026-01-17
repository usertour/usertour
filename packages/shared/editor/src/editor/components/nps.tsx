import * as Popover from '@radix-ui/react-popover';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import * as Widget from '@usertour-packages/widget';
import { useCallback, useEffect, useState, useMemo, memo } from 'react';
import { ContentActions } from '../..';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorNPSElement } from '../../types/editor';
import { EditorError, EditorErrorContent } from '../../components/editor-error';
import { EditorErrorAnchor } from '../../components/editor-error';
import { isEmptyString } from '@usertour/helpers';
import { BindAttribute } from './bind-attribute';

// Constants
const NPS_SCALE_LENGTH = 11;
const DEFAULT_LOW_LABEL = 'Not at all likely';
const DEFAULT_HIGH_LABEL = 'Extremely likely';

const buttonBaseClass =
  'flex items-center overflow-hidden group relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:border-sdk-question hover:bg-sdk-question/40 rounded-md main-transition p-2 justify-center w-auto min-w-0';

interface ContentEditorNPSProps {
  element: ContentEditorNPSElement;
  id: string;
  path: number[];
}

// Memoized NPS Scale component for better performance
const NPSScale = memo(({ onClick }: { onClick?: (value: number) => void }) => {
  const scaleButtons = useMemo(
    () =>
      Array.from({ length: NPS_SCALE_LENGTH }, (_, i) => (
        <Widget.Button
          key={`nps-button-${i}`}
          variant="custom"
          className={buttonBaseClass}
          onClick={() => onClick?.(i)}
        >
          {i}
        </Widget.Button>
      )),
    [onClick],
  );

  return (
    <div
      className="grid gap-1.5 !gap-1"
      style={{ gridTemplateColumns: `repeat(${NPS_SCALE_LENGTH}, minmax(0px, 1fr))` }}
    >
      {scaleButtons}
    </div>
  );
});

NPSScale.displayName = 'NPSScale';

// Memoized Labels component
const NPSLabels = memo(({ lowLabel, highLabel }: { lowLabel?: string; highLabel?: string }) => (
  <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
    <p>{lowLabel || DEFAULT_LOW_LABEL}</p>
    <p>{highLabel || DEFAULT_HIGH_LABEL}</p>
  </div>
));

NPSLabels.displayName = 'NPSLabels';

// Memoized Popover Content component
const NPSPopoverContent = memo(
  ({
    localData,
    handleDataChange,
    contextProps,
  }: {
    localData: ContentEditorNPSElement['data'];
    handleDataChange: (data: Partial<ContentEditorNPSElement['data']>) => void;
    contextProps: {
      zIndex: number;
      currentStep: any;
      currentVersion: any;
      contentList: any;
      createStep: any;
      attributes: any;
      projectId: string;
    };
  }) => {
    const { zIndex, currentStep, currentVersion, contentList, createStep, attributes, projectId } =
      contextProps;

    return (
      <div className="flex flex-col gap-2.5">
        <Label htmlFor="nps-question">Question name</Label>
        <Input
          id="nps-question"
          value={localData.name || ''}
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
            value={localData.lowLabel || ''}
            placeholder="Default"
            onChange={(e) => handleDataChange({ lowLabel: e.target.value })}
          />
          <Input
            type="text"
            value={localData.highLabel || ''}
            placeholder="Default"
            onChange={(e) => handleDataChange({ highLabel: e.target.value })}
          />
        </div>

        <BindAttribute
          bindToAttribute={localData.bindToAttribute || false}
          selectedAttribute={localData.selectedAttribute}
          zIndex={zIndex}
          projectId={projectId}
          onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
          onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
        />
      </div>
    );
  },
);

NPSPopoverContent.displayName = 'NPSPopoverContent';

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
    projectId,
  } = useContentEditorContext();

  const [openError, setOpenError] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [localData, setLocalData] = useState(element.data);

  // Memoize context props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      zIndex,
      currentStep,
      currentVersion,
      contentList,
      createStep,
      attributes,
      projectId,
    }),
    [zIndex, currentStep, currentVersion, contentList, createStep, attributes, projectId],
  );

  const handleDataChange = useCallback((data: Partial<ContentEditorNPSElement['data']>) => {
    setLocalData((prevData) => ({ ...prevData, ...data }));
  }, []);

  // Validate name field when popover closes
  useEffect(() => {
    setOpenError(isEmptyString(localData.name) && !isOpen);
  }, [localData.name, isOpen]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);

      if (open) {
        setOpenError(false);
        return;
      }

      // Validate and save data when closing
      if (isEmptyString(localData.name)) {
        setOpenError(true);
        return;
      }

      // Only update if data has changed
      if (JSON.stringify(localData) !== JSON.stringify(element.data)) {
        updateElement(
          {
            ...element,
            data: localData,
          },
          id,
        );
      }
    },
    [localData, element, id, updateElement],
  );

  return (
    <EditorError open={openError}>
      <EditorErrorAnchor className="w-full">
        <Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
          <Popover.Trigger asChild>
            <div className="w-full">
              <NPSScale />
              <NPSLabels lowLabel={localData.lowLabel} highLabel={localData.highLabel} />
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4 shadow-lg"
              style={{ zIndex }}
              sideOffset={10}
              side="right"
            >
              <NPSPopoverContent
                localData={localData}
                handleDataChange={handleDataChange}
                contextProps={contextProps}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </EditorErrorAnchor>
      <EditorErrorContent side="bottom" style={{ zIndex }}>
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
  onClick?: (element: ContentEditorNPSElement, value: number) => Promise<void>;
};

export const ContentEditorNPSSerialize = memo((props: ContentEditorNPSSerializeType) => {
  const { element, onClick } = props;
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(
    async (value: number) => {
      if (onClick) {
        setLoading(true);
        try {
          await onClick(element, value);
        } finally {
          setLoading(false);
        }
      }
    },
    [onClick, element],
  );

  return (
    <div className="w-full">
      <NPSScale onClick={loading ? undefined : handleClick} />
      <NPSLabels lowLabel={element.data.lowLabel} highLabel={element.data.highLabel} />
    </div>
  );
});

ContentEditorNPSSerialize.displayName = 'ContentEditorNPSSerialize';
