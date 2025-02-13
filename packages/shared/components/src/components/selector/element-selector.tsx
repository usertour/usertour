import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { EXTENSION_CONTENT_RULES } from '@usertour-ui/constants';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { Content, ElementSelectorPropsData } from '@usertour-ui/types';
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
  const handleSequenceValueChange = (value: string) => {
    updateInnerData({ sequence: value });
  };

  return (
    <div className="space-y-3" ref={ref}>
      <div className="flex flex-col  bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-start items-center space-x-1	">
              <Label htmlFor="button-manual-element-text">Element text</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <QuestionMarkCircledIcon />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-foreground text-background">
                    <p>Usertour will select an element containing the text you write here.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="button-manual-element-text"
              value={innerData.content || ''}
              placeholder="None"
              onChange={handleElementTextChange}
            />
            <div className="flex justify-start items-center space-x-1	">
              <Label htmlFor="button-manual-css-selector">CSS selector</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <QuestionMarkCircledIcon />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-foreground text-background">
                    <p>
                      Advanced feature: If possible, we recommend selecting elements using text. lf
                      an element does not have text, or the text is very generic, you can select it
                      using a CSS selector instead. lf both text and CSS selector is filled in,
                      Usertour will select an element matching both.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <QuestionMarkCircledIcon />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-foreground text-background">
                    <p>
                      If multiple elements match your criteria, you can tell Usertour which of the
                      elements to select.
                    </p>
                    <p>
                      Elements are sorted first by vertical position and second by horizontal
                      position. l.e. an element higher up on the page and more towards the left
                      takes precedence.{' '}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select onValueChange={handleSequenceValueChange} defaultValue={innerData.sequence}>
              <SelectTrigger>
                <SelectValue placeholder="Select a option" />
              </SelectTrigger>
              <SelectContent
                style={{
                  zIndex: EXTENSION_CONTENT_RULES,
                }}
              >
                <SelectGroup>
                  <SelectItem value="1st">
                    <div className="flex">select 1st element</div>
                  </SelectItem>
                  <SelectItem value="2st">
                    <div className="flex">select 2st element</div>
                  </SelectItem>
                  <SelectItem value="3st">
                    <div className="flex">select 3st element</div>
                  </SelectItem>
                  <SelectItem value="4st">
                    <div className="flex">select 4st element</div>
                  </SelectItem>
                  <SelectItem value="5st">
                    <div className="flex">select 5st element</div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
ElementSelector.displayName = 'ElementSelector';
