import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { Content, ElementSelectorPropsData } from '@usertour/types';
import { ComboBox } from '@usertour-packages/combo-box';
import { EXTENSION_CONTENT_RULES } from '@usertour-packages/constants';
import { ChangeEvent, useCallback, useRef, useState } from 'react';

export interface ElementSelectorProps {
  data: ElementSelectorPropsData;
  onDataChange: (data: ElementSelectorPropsData) => void;
  isInput?: boolean;
  currentContent: Content | undefined;
  token: string;
  onElementChange?: () => void;
}

export const ElementSelector = (props: ElementSelectorProps) => {
  const { data, onDataChange } = props;
  const ref = useRef(null);
  const [innerData, setInnerData] = useState(data);

  const updateInnerData = useCallback(
    (props: Partial<ElementSelectorPropsData>) => {
      const _innerData = {
        precision: 'loose',
        sequence: '1st',
        ...innerData,
        ...props,
        type: 'manual',
      };
      setInnerData(_innerData);
      onDataChange(_innerData);
    },
    [innerData],
  );

  const handleElementTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateInnerData({ content: value });
  };
  const handleSelectorChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateInnerData({ customSelector: value });
  };
  const sequenceOptions = [
    { value: '1st', name: 'select 1st element' },
    { value: '2st', name: 'select 2nd element' },
    { value: '3st', name: 'select 3rd element' },
    { value: '4st', name: 'select 4th element' },
    { value: '5st', name: 'select 5th element' },
  ];

  const handleSequenceValueChange = useCallback(
    (value: string) => {
      updateInnerData({ sequence: value });
    },
    [updateInnerData],
  );

  return (
    <div className="space-y-3" ref={ref}>
      <div className="flex flex-col  bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-start items-center space-x-1	">
              <Label htmlFor="button-manual-element-text">Element text</Label>
              <QuestionTooltip>
                Usertour will select an element containing the text you write here.
              </QuestionTooltip>
            </div>
            <Input
              id="button-manual-element-text"
              value={innerData.content || ''}
              placeholder="None"
              onChange={handleElementTextChange}
            />
            <div className="flex justify-start items-center space-x-1	">
              <Label htmlFor="button-manual-css-selector">CSS selector</Label>
              <QuestionTooltip>
                Advanced feature: If possible, we recommend selecting elements using text. lf an
                element does not have text, or the text is very generic, you can select it using a
                CSS selector instead. lf both text and CSS selector is filled in, Usertour will
                select an element matching both.
              </QuestionTooltip>
            </div>
            <Input
              id="button-manual-css-selector"
              value={innerData.customSelector || ''}
              placeholder="None"
              onChange={handleSelectorChange}
            />
            <div className="flex flex-row gap-1 text-sm font-medium leading-none flex-wrap">
              {innerData.selectorsList?.map((item, key) => (
                <Button
                  variant="secondary"
                  className="min-h-7 h-auto py-2 bg-secondary-hover hover:text-primary"
                  key={key}
                  onClick={() => {
                    updateInnerData({ customSelector: item });
                  }}
                >
                  {item}
                </Button>
              ))}
            </div>
            <div className="flex justify-start items-center space-x-1	">
              <Label htmlFor="button-manual-css-selector">If multiple matches</Label>
              <QuestionTooltip>
                <p>
                  If multiple elements match your criteria, you can tell Usertour which of the
                  elements to select.
                </p>
                <p>
                  Elements are sorted first by vertical position and second by horizontal position.
                  l.e. an element higher up on the page and more towards the left takes precedence.
                </p>
              </QuestionTooltip>
            </div>
            <ComboBox
              options={sequenceOptions}
              value={innerData.sequence}
              onValueChange={handleSequenceValueChange}
              placeholder="Select a option"
              className="w-full"
              contentStyle={{ zIndex: EXTENSION_CONTENT_RULES }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
ElementSelector.displayName = 'ElementSelector';
