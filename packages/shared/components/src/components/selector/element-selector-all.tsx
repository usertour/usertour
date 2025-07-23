import { Crosshair2Icon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { EXTENSION_CONTENT_RULES } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { Switch } from '@usertour-packages/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { Content, ElementSelectorPropsData } from '@usertour-packages/types';
import { ChangeEvent, useCallback, useRef, useState } from 'react';
import { SelectorDialog } from './selector-dialog';

export interface ElementSelectorProps {
  data: ElementSelectorPropsData;
  onDataChange: (data: ElementSelectorPropsData) => void;
  isInput?: boolean;
  currentContent: Content | undefined;
  token: string;
  onElementChange?: () => void;
}

export const ElementSelector = (props: ElementSelectorProps) => {
  const { data, onDataChange, isInput = false, currentContent, token, onElementChange } = props;
  const ref = useRef(null);
  const [innerData, setInnerData] = useState(data);

  const updateInnerData = useCallback(
    (props: Partial<ElementSelectorPropsData>) => {
      const _innerData = {
        precision: 'loose',
        sequence: '1st',
        ...innerData,
        ...props,
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
  const handleDynamicValueChange = (checked: boolean) => {
    updateInnerData({ isDynamicContent: checked });
  };
  const handleTypeChange = (value: string) => {
    updateInnerData({ type: value });
  };
  const handleSequenceValueChange = (value: string) => {
    updateInnerData({ sequence: value });
  };
  const handlePrecisionValueChange = (value: string) => {
    updateInnerData({ precision: value });
  };

  const handleElementSelectSuccess = (output: any) => {
    updateInnerData({
      selectors: output.target.selectors,
      content: output.target.content,
      screenshot: output.screenshot.mini,
      selectorsList: output.target.selectorsList,
    });
  };

  return (
    <div className="space-y-3" ref={ref}>
      <Tabs defaultValue={innerData.type} value={innerData.type} onValueChange={handleTypeChange}>
        <TabsList className="grid w-full grid-cols-2 bg-background-700">
          <TabsTrigger
            value="auto"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Auto
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Manual
          </TabsTrigger>
        </TabsList>
        <div className="flex flex-col  bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
          <TabsContent value="auto" className="focus-visible:ring-0 focus-visible:ring-offset-0">
            <div className="flex flex-col space-y-2 focus:outline-none">
              <div className="rounded-2xl flex-col overflow-hidden border border-primary">
                <div className="min-w-[242px] min-h-[130px] overflow-hidden">
                  <img src={innerData.screenshot} alt="" />
                </div>
                {onElementChange && (
                  <Button className="w-full rounded-none" onClick={onElementChange}>
                    <Crosshair2Icon className="mr-2" />
                    {!innerData && 'Select element'}
                    {innerData && 'Select another element'}
                  </Button>
                )}
                {!onElementChange && (
                  <SelectorDialog
                    onSuccess={handleElementSelectSuccess}
                    zIndex={EXTENSION_CONTENT_RULES}
                    buildUrl={currentContent?.buildUrl}
                    token={token}
                    isInput={isInput}
                  >
                    <Button className="w-full rounded-none">
                      <Crosshair2Icon className="mr-2" />
                      {!innerData && 'Select element'}
                      {innerData && 'Select another element'}
                    </Button>
                  </SelectorDialog>
                )}
              </div>
              <div className="items-center  space-y-2">
                <div className="flex justify-start items-center space-x-1	">
                  <Label>Precision</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <QuestionMarkCircledIcon />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-foreground text-background">
                        <p>
                          How flexible Usertour should be when looking for the element. If Usertour
                          can't find your element, try to make the precision looser. lf Usertour
                          tends to find the wrong element, try to make the precision stricter.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  onValueChange={handlePrecisionValueChange}
                  defaultValue={innerData.precision}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a distribute" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      zIndex: EXTENSION_CONTENT_RULES,
                    }}
                  >
                    <SelectGroup>
                      <SelectItem value="loosest">
                        <div className="flex">Loosest</div>
                      </SelectItem>
                      <SelectItem value="looser">
                        <div className="flex">Looser</div>
                      </SelectItem>
                      <SelectItem value="loose">
                        <div className="flex">Loose</div>
                      </SelectItem>
                      <SelectItem value="strict">
                        <div className="flex">Strict</div>
                      </SelectItem>
                      <SelectItem value="stricter">
                        <div className="flex">Stricter</div>
                      </SelectItem>
                      <SelectItem value="strictest">
                        <div className="flex">Strictest</div>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="flex space-x-2 grow">
                  <Label htmlFor="dynamic-content" className="flex flex-col space-y-1">
                    <span className="font-normal">Dynamic text</span>
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <QuestionMarkCircledIcon />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-foreground text-background">
                        <p>
                          If the element's text is dynamic and may change, enabled this switch to
                          make Usertour find it without considering its current text.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="dynamic-content"
                  checked={innerData.isDynamicContent}
                  className="data-[state=unchecked]:bg-input"
                  onCheckedChange={handleDynamicValueChange}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="manual" className="focus-visible:ring-0 focus-visible:ring-offset-0">
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
                          Advanced feature: If possible, we recommend selecting elements using text.
                          lf an element does not have text, or the text is very generic, you can
                          select it using a CSS selector instead. lf both text and CSS selector is
                          filled in, Usertour will select an element matching both.
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
                          If multiple elements match your criteria, you can tell Usertour which of
                          the elements to select.
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
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
ElementSelector.displayName = 'ElementSelector';
