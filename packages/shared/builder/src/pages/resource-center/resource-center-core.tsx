'use client';

import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_SELECT } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { ScrollArea } from '@usertour-packages/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { ResourceCenterBlockType } from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import { useBuilderContext, useResourceCenterContext } from '../../contexts';
import { SidebarContainer } from '../sidebar';
import { SidebarFooter } from '../sidebar/sidebar-footer';
import { SidebarHeader } from '../sidebar/sidebar-header';
import { SidebarTheme } from '../sidebar/sidebar-theme';
import { ResourceCenterBlocks } from './components/resource-center-blocks';
import { useState } from 'react';
import type { ResourceCenterBlock } from '@usertour/types';

const labelStyles = 'flex justify-start items-center space-x-1';

const BLOCK_TYPE_OPTIONS = [
  { value: ResourceCenterBlockType.MESSAGE, label: 'Message' },
  { value: ResourceCenterBlockType.CHECKLIST, label: 'Checklist' },
  { value: ResourceCenterBlockType.ACTION_LINK, label: 'Action', disabled: true },
  { value: ResourceCenterBlockType.SUB_PAGE, label: 'Sub-page', disabled: true },
  { value: ResourceCenterBlockType.CONTACT, label: 'Contact', disabled: true },
  {
    value: ResourceCenterBlockType.CONTENT_LIST,
    label: 'List of flows/checklists',
    disabled: true,
  },
  { value: ResourceCenterBlockType.AI_ASSISTANT, label: 'AI Assistant', disabled: true },
  { value: ResourceCenterBlockType.KNOWLEDGE_BASE, label: 'Knowledge base', disabled: true },
];

const createBlock = (type: ResourceCenterBlockType): ResourceCenterBlock | null => {
  const id = uuidV4();
  switch (type) {
    case ResourceCenterBlockType.MESSAGE:
      return {
        id,
        type: ResourceCenterBlockType.MESSAGE,
        content: [],
        onlyShowTask: false,
        onlyShowTaskConditions: [],
      };
    case ResourceCenterBlockType.CHECKLIST:
      return {
        id,
        type: ResourceCenterBlockType.CHECKLIST,
        onlyShowTask: false,
        onlyShowTaskConditions: [],
      };
    default:
      return null;
  }
};

const ResourceCenterCoreBody = () => {
  const { localData, zIndex, addBlock, updateLocalData } = useResourceCenterContext();
  const [addBlockType, setAddBlockType] = useState<string>('');

  if (!localData) {
    return null;
  }

  const handleAddBlock = (type: string) => {
    const block = createBlock(type as ResourceCenterBlockType);
    if (block) {
      addBlock(block);
    }
    setAddBlockType('');
  };

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />

          {/* Header Text */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="header-text">Header text</Label>
            </div>
            <Input
              className="bg-background-900"
              id="header-text"
              value={localData.headerText}
              onChange={(e) => {
                updateLocalData({ headerText: e.target.value });
              }}
              placeholder="Resource Center"
            />
          </div>

          {/* Launcher Button Text */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="launcher-button-text">Launcher button text</Label>
            </div>
            <Input
              className="bg-background-900"
              id="launcher-button-text"
              value={localData.buttonText}
              onChange={(e) => {
                updateLocalData({ buttonText: e.target.value });
              }}
              placeholder="None"
            />
          </div>

          <ResourceCenterBlocks />

          {/* Add Block */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label>Add block</Label>
            </div>
            <Select value={addBlockType} onValueChange={handleAddBlock}>
              <SelectTrigger>
                <SelectValue placeholder="Select block type..." />
              </SelectTrigger>
              <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                <SelectContent>
                  <SelectGroup>
                    {BLOCK_TYPE_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </SelectPortal>
            </Select>
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const ResourceCenterCoreHeader = () => {
  const { currentContent } = useBuilderContext();
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8">
        <SidebarHeader title={currentContent?.name ?? ''} />
      </CardTitle>
    </CardHeader>
  );
};

const ResourceCenterCoreFooter = () => {
  const { isLoading, onSaved } = useBuilderContext();
  const { flushSave } = useResourceCenterContext();

  const handleSave = async () => {
    await flushSave();
    await onSaved?.();
  };

  return (
    <CardFooter className="flex p-5">
      <SidebarFooter onSave={handleSave} isLoading={isLoading} />
    </CardFooter>
  );
};

export const ResourceCenterCore = () => {
  return (
    <SidebarContainer>
      <ResourceCenterCoreHeader />
      <ResourceCenterCoreBody />
      <ResourceCenterCoreFooter />
    </SidebarContainer>
  );
};

ResourceCenterCore.displayName = 'ResourceCenterCore';
