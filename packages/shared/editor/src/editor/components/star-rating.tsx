import * as Popover from '@radix-ui/react-popover';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import { RulesCondition } from '@usertour-ui/types';
import { cn } from '@usertour-ui/ui-utils';
import { useCallback, useEffect, useState } from 'react';
import { ContentActions } from '../..';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorStarRatingElement } from '../../types/editor';
import { EditorErrorContent } from '../../components/editor-error';
import { EditorError } from '../../components/editor-error';
import { EditorErrorAnchor } from '../../components/editor-error';
import { isEmptyString } from '@usertour-ui/shared-utils';

const StarButton = ({
  className,
  onMouseEnter,
  onMouseLeave,
}: {
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) => (
  <svg
    className={cn('w-8 h-8 cursor-pointer', className)}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 22 20"
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
  </svg>
);

interface ContentEditorStarRatingProps {
  element: ContentEditorStarRatingElement;
  id: string;
  path: number[];
}

export const ContentEditorStarRating = (props: ContentEditorStarRatingProps) => {
  const { element, id } = props;
  const {
    updateElement,
    zIndex,
    currentStep,
    currentVersion,
    attributes,
    contentList,
    createStep,
  } = useContentEditorContext();
  const [isOpen, setIsOpen] = useState<boolean>();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isShowError, setIsShowError] = useState<boolean>(false);
  const handleStarHover = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

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

  const handleLabelChange = (value: string, key: string) => {
    updateElement({ ...element, data: { ...element.data, [key]: value } }, id);
  };

  useEffect(() => {
    setIsShowError(isEmptyString(element.data.name));
  }, [element?.data?.name]);

  return (
    <EditorError open={isShowError}>
      <EditorErrorAnchor>
        <Popover.Root modal={true} onOpenChange={setIsOpen} open={isOpen}>
          <Popover.Trigger asChild>
            <div>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: 'repeat(5, minmax(0px, 1fr))' }}
                data-relin-paragraph="655"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <StarButton
                    key={i}
                    className={cn({
                      'text-sdk-question': hoveredIndex !== null && i <= hoveredIndex,
                    })}
                    onMouseEnter={() => handleStarHover(i)}
                  />
                ))}
              </div>
              {(element.data.lowLabel || element.data.highLabel) && (
                <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
                  <p>{element.data.lowLabel}</p>
                  <p>{element.data.highLabel}</p>
                </div>
              )}
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4"
              style={{ zIndex }}
            >
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="star-rating-question">Question name</Label>
                <Input
                  id="star-rating-question"
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
                  contents={contentList}
                  createStep={createStep}
                />
                <Label className="flex items-center gap-1">Scale range</Label>
                <div className="flex flex-row gap-2 items-center">
                  <Input
                    type="number"
                    value={element.data.lowRange}
                    placeholder="Default"
                    onChange={(e) => handleLabelChange(e.target.value, 'lowRange')}
                  />
                  <p>-</p>
                  <Input
                    type="number"
                    value={element.data.highRange}
                    placeholder="Default"
                    onChange={(e) => handleLabelChange(e.target.value, 'highRange')}
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

ContentEditorStarRating.displayName = 'ContentEditorStarRating';

export const ContentEditorStarRatingSerialize = (props: {
  element: ContentEditorStarRatingElement;
  onClick?: (element: ContentEditorStarRatingElement) => void;
}) => {
  const { element } = props;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleStarHover = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  return (
    <div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(5, minmax(0px, 1fr))' }}
        data-relin-paragraph="655"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <StarButton
            key={i}
            className={cn({
              'text-sdk-question': hoveredIndex !== null && i <= hoveredIndex,
            })}
            onMouseEnter={() => handleStarHover(i)}
          />
        ))}
      </div>
      {(element.data.lowLabel || element.data.highLabel) && (
        <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
          <p>{element.data.lowLabel}</p>
          <p>{element.data.highLabel}</p>
        </div>
      )}
    </div>
  );
};

ContentEditorStarRatingSerialize.displayName = 'ContentEditorStarRatingSerialize';
