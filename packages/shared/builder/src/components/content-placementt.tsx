import { Crosshair2Icon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@usertour-ui/button";
import { EXTENSION_SELECT } from "@usertour-ui/constants";
import { Input } from "@usertour-ui/input";
import { Label } from "@usertour-ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from "@usertour-ui/select";
import { SelectorDialog } from "@usertour-ui/shared-components";
import { ContentActions } from "@usertour-ui/shared-editor";
import { Switch } from "@usertour-ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@usertour-ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";
import {
  Attribute,
  Content,
  ContentVersion,
  ElementSelectorPropsData,
  RulesCondition,
  Step,
  StepScreenshot,
} from "@usertour-ui/types";
import { ChangeEvent } from "react";
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from "./content-error";

export interface ContentPlacementProps {
  title?: string;
  subTitle?: string;
  target: ElementSelectorPropsData | undefined;
  attributeList: Attribute[] | undefined;
  currentVersion: ContentVersion | undefined;
  zIndex: number;
  onTargetChange: (value: Partial<ElementSelectorPropsData>) => void;
  onScreenChange?: (value: StepScreenshot) => void;
  onChangeElement: () => void;
  contents: Content[];
  screenshot: StepScreenshot | undefined;
  buildUrl?: string;
  currentStep: Step | undefined;
  token: string;
  isWebBuilder?: boolean;
  isShowError?: boolean;
  isShowActions?: boolean;
  createStep?: (
    currentVersion: ContentVersion,
    sequence: number
  ) => Promise<Step | undefined>;
}
export const ContentPlacement = (props: ContentPlacementProps) => {
  const {
    target,
    attributeList,
    currentVersion,
    zIndex,
    onTargetChange,
    onChangeElement,
    contents,
    screenshot,
    isWebBuilder,
    token,
    buildUrl,
    onScreenChange,
    isShowError = false,
    isShowActions = true,
    currentStep,
    createStep,
    title = "Element",
    subTitle = "Show tooltip on this element",
  } = props;

  const handleSequenceChange = (value: string) => {
    onTargetChange({ sequence: value });
  };
  const handlePrecisionChange = (value: string) => {
    onTargetChange({ precision: value });
  };
  const handleDynamicContent = (value: boolean) => {
    onTargetChange({ isDynamicContent: value });
  };
  const handleActionChange = (actions: RulesCondition[]) => {
    onTargetChange({ actions });
  };
  const handlePlacementTypeChange = (value: string) => {
    onTargetChange({ type: value });
  };
  const handleElementTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    onTargetChange({ content: e.target.value });
  };
  const handleSelectorChange = (e: ChangeEvent<HTMLInputElement>) => {
    onTargetChange({ customSelector: e.target.value });
  };
  const handleCustomSelectorSelect = (item: string) => {
    onTargetChange({ customSelector: item });
  };
  const handleElementSelectSuccess = (output: any) => {
    onTargetChange({
      selectors: output.target.selectors,
      content: output.target.content,
      selectorsList: output.target.selectorsList,
    });
    if (onScreenChange) {
      onScreenChange(output.screenshot);
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm">{title}</h1>
      <Tabs
        defaultValue={target?.type ?? "auto"}
        onValueChange={handlePlacementTypeChange}
      >
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
          <TabsContent value="auto">
            <ContentError
              open={
                isShowError &&
                (!target?.selectors || target?.selectors.length == 0)
              }
            >
              <div className="flex flex-col space-y-2">
                <h1 className="text-sm">{subTitle}</h1>
                {!isWebBuilder && (
                  <div
                    className="rounded-2xl flex-col overflow-hidden"
                    onClick={onChangeElement}
                  >
                    <div className="w-[242px] h-[130px] overflow-hidden">
                      <img src={screenshot?.mini} alt="" />
                    </div>
                    <ContentErrorAnchor>
                      <Button className="w-full rounded-none">
                        <Crosshair2Icon className="mr-2"></Crosshair2Icon>
                        Select another element
                      </Button>
                    </ContentErrorAnchor>
                  </div>
                )}

                {isWebBuilder && (
                  <SelectorDialog
                    onSuccess={handleElementSelectSuccess}
                    buildUrl={buildUrl}
                    zIndex={zIndex + EXTENSION_SELECT}
                    token={token}
                  >
                    <div className="rounded-2xl flex-col overflow-hidden">
                      <div className="w-[242px] h-[130px] overflow-hidden">
                        <img src={screenshot?.mini} alt="" />
                      </div>
                      <ContentErrorAnchor>
                        <Button className="w-full rounded-none">
                          <Crosshair2Icon className="mr-2"></Crosshair2Icon>
                          {!target && "Select element"}
                          {target && "Select another element"}
                        </Button>
                      </ContentErrorAnchor>
                    </div>
                  </SelectorDialog>
                )}
                <div className="items-center  space-y-2">
                  <div className="flex justify-start items-center space-x-1	">
                    <Label>Precision</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            How flexible Usertour should be when looking for the
                            element. If Usertour can't find your element, try to
                            make the precision looser. lf Usertour tends to find
                            the wrong element, try to make the precision
                            stricter.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    onValueChange={handlePrecisionChange}
                    defaultValue={target?.precision}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a distribute" />
                    </SelectTrigger>
                    <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                      <SelectContent>
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
                    </SelectPortal>
                  </Select>
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex space-x-2 grow">
                    <Label
                      htmlFor="dynamic-content"
                      className="flex flex-col space-y-1"
                    >
                      <span className="font-normal">Dynamic text</span>
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            If the element's text is dynamic and may change,
                            enabled this switch to make Usertour find it without
                            considering its current text.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    className="data-[state=unchecked]:bg-input"
                    id="dynamic-content"
                    checked={target?.isDynamicContent ?? true}
                    onCheckedChange={handleDynamicContent}
                  />
                </div>
              </div>
              <ContentErrorContent
                style={{ zIndex: zIndex + EXTENSION_SELECT }}
              >
                Please select an element
              </ContentErrorContent>
            </ContentError>
          </TabsContent>
          <TabsContent value="manual">
            <ContentError open={isShowError && !target?.customSelector}>
              <div className="flex flex-col space-y-2">
                <h1 className="text-sm">{subTitle}</h1>
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-start items-center space-x-1	">
                    <Label htmlFor="button-manual-element-text">
                      Element text
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Usertour will select an element containing the text
                            you write here.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    className="bg-background-900"
                    id="button-manual-element-text"
                    value={target?.content}
                    placeholder="None"
                    onChange={handleElementTextChange}
                  />
                  <div className="flex justify-start items-center space-x-1	">
                    <Label htmlFor="button-manual-css-selector">
                      CSS selector
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Advanced feature: If possible, we recommend
                            selecting elements using text. lf an element does
                            not have text, or the text is very generic, you can
                            select it using a CSS selector instead. lf both text
                            and CSS selector is filled in, Usertour will select
                            an element matching both.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <ContentErrorAnchor>
                    <Input
                      className="bg-background-900"
                      id="button-manual-css-selector"
                      value={target?.customSelector}
                      placeholder="None"
                      onChange={handleSelectorChange}
                    />
                  </ContentErrorAnchor>
                  <div className="flex flex-row gap-1 text-sm font-medium leading-none flex-wrap">
                    {target?.selectorsList?.map((item, key) => (
                      <Button
                        variant="secondary"
                        className="min-h-7 h-auto py-2 bg-background-900 hover:bg-secondary-hover dark:hover:bg-gray-800"
                        key={key}
                        onClick={() => {
                          handleCustomSelectorSelect(item);
                        }}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-start items-center space-x-1	">
                    <Label htmlFor="button-manual-css-selector">
                      If multiple matches
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            If multiple elements match your criteria, you can
                            tell Usertour which of the elements to select.
                          </p>
                          <p>
                            Elements are sorted first by vertical position and
                            second by horizontal position. l.e. an element
                            higher up on the page and more towards the left
                            takes precedence.{" "}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    onValueChange={handleSequenceChange}
                    defaultValue={target?.sequence}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a option" />
                    </SelectTrigger>
                    <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                      <SelectContent>
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
                    </SelectPortal>
                  </Select>
                </div>
              </div>
              <ContentErrorContent
                style={{ zIndex: zIndex + EXTENSION_SELECT }}
              >
                CSS selector is required
              </ContentErrorContent>
            </ContentError>
          </TabsContent>
          {isShowActions && (
            <div className="flex flex-col space-y-2">
              <div className="items-center  space-y-2">
                <Label>When target element is clicked</Label>

                <ContentActions
                  zIndex={zIndex + EXTENSION_SELECT}
                  isShowIf={false}
                  isShowLogic={false}
                  currentStep={currentStep}
                  currentVersion={currentVersion}
                  onDataChange={handleActionChange}
                  defaultConditions={target?.actions || []}
                  attributes={attributeList}
                  contents={contents}
                  createStep={createStep}
                />
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};
ContentPlacement.displayName = "ContentPlacement";
