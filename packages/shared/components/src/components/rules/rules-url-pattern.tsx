import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Delete2Icon, PagesIcon, PlusIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { getUrlPatternError } from '@usertour-ui/shared-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';
import { RulesLogic } from './rules-logic';
import { RulesPopover, RulesPopoverContent, RulesPopoverTrigger } from './rules-popper';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';
import { useRulesContext } from './rules-context';

export interface RulesUrlPatternProps {
  index: number;
  type: string;
  data?: {
    excludes?: string[];
    includes?: string[];
  };
}

export const RulesUrlPattern = (props: RulesUrlPatternProps) => {
  const { data = {}, index } = props;
  const { excludes = [], includes = [] } = data;
  const [excludesValues, setExcludesValues] = useState(excludes);
  const [includesValues, setIncludesValues] = useState(includes);
  const [filterExcludesValues, setFilterExcludesValues] = useState(
    excludes.filter((v) => v !== ''),
  );
  const [filterIncludesValues, setFilterIncludesValues] = useState(
    includesValues.filter((v) => v !== ''),
  );
  const [openError, setOpenError] = useState(false);
  const [open, setOpen] = useState(false);
  const { updateConditionData } = useRulesGroupContext();
  const { disabled } = useRulesContext();
  const [errorInfo, setErrorInfo] = useState('');

  const deleteIncludeItem = (index: number) => {
    const v = [...includesValues];
    v.splice(index, 1);
    setIncludesValues(v);
  };
  const deleteExcludeItem = (index: number) => {
    const v = [...excludesValues];
    v.splice(index, 1);
    setExcludesValues(v);
  };

  const handleIncludeOnChange = (value: string, index: number) => {
    const v = [...includesValues];
    v[index] = value;
    setIncludesValues(v);
  };
  const handleExcludeOnChange = (value: string, index: number) => {
    const v = [...excludesValues];
    v[index] = value;
    setExcludesValues(v);
  };

  useEffect(() => {
    setFilterExcludesValues(excludesValues.filter((v) => v !== ''));
    setFilterIncludesValues(includesValues.filter((v) => v !== ''));
  }, [includesValues, excludesValues]);

  useEffect(() => {
    if (open) {
      return;
    }
    const updates = {
      excludes: filterExcludesValues,
      includes: filterIncludesValues,
    };
    const { showError, errorInfo } = getUrlPatternError(updates);
    setOpenError(showError);
    setErrorInfo(errorInfo);
    updateConditionData(index, updates);
  }, [filterExcludesValues, filterIncludesValues, open, index, updateConditionData]);

  return (
    <RulesError open={openError}>
      <div className="flex flex-row space-x-3">
        <RulesLogic index={index} disabled={disabled} />
        <RulesErrorAnchor asChild>
          <RulesConditionRightContent disabled={disabled}>
            <RulesConditionIcon>
              <PagesIcon width={16} height={16} />
            </RulesConditionIcon>
            <RulesPopover onOpenChange={setOpen} open={open}>
              <RulesPopoverTrigger>
                Current page matches <span className="font-bold">{includesValues.join(',')}</span>{' '}
                and does not match <span className="font-bold">{excludesValues.join(',')}</span>
              </RulesPopoverTrigger>
              <RulesPopoverContent>
                <div className=" flex flex-col space-y-2">
                  <div className=" flex flex-col space-y-1">
                    <div className="flex flex-row">
                      <div className="grow">URL matches</div>
                      <div className="flex-none inline-flex px-2 items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PlusIcon
                                width={16}
                                height={16}
                                className="cursor-pointer"
                                onClick={() => {
                                  setIncludesValues([...includesValues, '']);
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-foreground text-background">
                              Add URL pattern
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    {includesValues.map((value, index) => {
                      const key = `index-${index}`;
                      return (
                        <div className="flex flex-row" key={key}>
                          <div className="grow">
                            <Input
                              type="text"
                              className="py-3 px-4 ps-4 pe-8 block w-full  shadow-sm rounded-lg text-sm "
                              defaultValue={value}
                              placeholder={''}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value;
                                handleIncludeOnChange(value, index);
                              }}
                            />
                          </div>
                          <div className="flex-none inline-flex px-2 items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Delete2Icon
                                    width={16}
                                    height={16}
                                    onClick={() => {
                                      deleteIncludeItem(index);
                                    }}
                                    className="cursor-pointer"
                                  />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-foreground text-background">
                                  Remove URL pattern
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className=" flex flex-col space-y-1">
                    <div className="flex flex-row">
                      <div className="grow">URL does not match</div>
                      <div className="flex-none inline-flex px-2 items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PlusIcon
                                width={16}
                                height={16}
                                className="cursor-pointer"
                                onClick={() => {
                                  setExcludesValues([...excludesValues, '']);
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-foreground text-background">
                              Add URL pattern
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    {excludesValues.map((value, index) => {
                      const key = `index-${index}`;
                      return (
                        <div className="flex flex-row" key={key}>
                          <div className="grow">
                            <Input
                              type="text"
                              className="py-3 px-4 ps-4 pe-8 block w-full  shadow-sm rounded-lg text-sm "
                              defaultValue={value}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value;
                                handleExcludeOnChange(value, index);
                              }}
                              placeholder={''}
                            />
                          </div>
                          <div className="flex-none inline-flex px-2 items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Delete2Icon
                                    width={16}
                                    height={16}
                                    className="cursor-pointer"
                                    onClick={() => {
                                      deleteExcludeItem(index);
                                    }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-foreground text-background">
                                  Remove URL pattern
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <a
                    href="https://docs.usertour.io/how-to-guides/urls/"
                    className="text-primary flex flex-row items-center space-x-1 text-xs"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Read full URL pattern matching guide</span>
                    <OpenInNewWindowIcon className="size-3.5" />
                  </a>
                </div>
              </RulesPopoverContent>
            </RulesPopover>
            <RulesRemove index={index} />
          </RulesConditionRightContent>
        </RulesErrorAnchor>
        <RulesErrorContent>{errorInfo}</RulesErrorContent>
      </div>
    </RulesError>
  );
};

RulesUrlPattern.displayName = 'RulesUrlPattern';
