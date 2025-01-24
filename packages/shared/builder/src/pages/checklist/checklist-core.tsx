"use client";

import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@usertour-ui/card";
import { EXTENSION_SELECT } from "@usertour-ui/constants";
import { ScrollArea } from "@usertour-ui/scroll-area";
import { uuidV4 } from "@usertour-ui/ui-utils";
import { useBuilderContext, useChecklistContext } from "../../contexts";
import { SidebarFooter } from "../sidebar/sidebar-footer";
import { SidebarHeader } from "../sidebar/sidebar-header";
import { SidebarTheme } from "../sidebar/sidebar-theme";
import { ChecklistContents } from "./components/checklist-contents";
import { Label } from "@usertour-ui/label";
import { Input } from "@usertour-ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from "@usertour-ui/select";
import { Switch } from "@usertour-ui/switch";
import { Button } from "@usertour-ui/button";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { SidebarContainer } from "../sidebar";
import {
  ChecklistCompletionOrder,
  ChecklistInitialDisplay,
} from "@usertour-ui/types";
import { useState } from "react";

// Common styles
const flexBetween = "flex items-center justify-between space-x-2";
const labelStyles = "flex justify-start items-center space-x-1";

const defaultItem = {
  name: "New Item",
  description: "New Item Description",
  clickedActions: [],
  isCompleted: false,
  completeConditions: [],
  onlyShowTask: false,
  onlyShowTaskConditions: [],
};

const ChecklistCoreBody = () => {
  const { localData, zIndex, addItem, updateLocalData } = useChecklistContext();

  if (!localData) {
    return null;
  }

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />

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

          <ChecklistContents />

          {/* Add Item Button */}
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => addItem({ ...defaultItem, id: uuidV4() })}
          >
            <PlusCircledIcon className="mr-2" />
            Add item
          </Button>

          {/* Initial Display Select */}
          <div className={labelStyles}>
            <Label htmlFor="initial-display">Initially show as</Label>
          </div>
          <Select
            onValueChange={(value) =>
              updateLocalData({
                initialDisplay: value as ChecklistInitialDisplay,
              })
            }
            defaultValue={localData.initialDisplay}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a option" />
            </SelectTrigger>
            <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ChecklistInitialDisplay.EXPANDED}>
                    Expanded checklist
                  </SelectItem>
                  <SelectItem value={ChecklistInitialDisplay.BUTTON}>
                    Launcher button
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </SelectPortal>
          </Select>

          {/* Task Completion Order Select */}
          <div className={labelStyles}>
            <Label htmlFor="completion-order">Task completion order</Label>
          </div>
          <Select
            onValueChange={(value) =>
              updateLocalData({
                completionOrder: value as ChecklistCompletionOrder,
              })
            }
            defaultValue={localData.completionOrder}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a option" />
            </SelectTrigger>
            <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ChecklistCompletionOrder.ANY}>
                    In any order
                  </SelectItem>
                  <SelectItem value={ChecklistCompletionOrder.ORDERED}>
                    In order
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </SelectPortal>
          </Select>

          {/* Prevent Dismiss Checklist Switch */}
          <div className={flexBetween}>
            <Label htmlFor="prevent-dismiss-checklist" className="font-normal">
              Prevent users from dismissing checklist
            </Label>
            <Switch
              id="prevent-dismiss-checklist"
              className="data-[state=unchecked]:bg-input"
              checked={localData.preventDismissChecklist}
              onCheckedChange={(value) =>
                updateLocalData({ preventDismissChecklist: value })
              }
            />
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const ChecklistCoreHeader = () => {
  const { currentContent } = useBuilderContext();
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8">
        <SidebarHeader title={currentContent?.name ?? ""} />
      </CardTitle>
    </CardHeader>
  );
};

const ChecklistCoreFooter = () => {
  return (
    <CardFooter className="flex p-5">
      <SidebarFooter />
    </CardFooter>
  );
};

export const ChecklistCore = () => {
  return (
    <SidebarContainer>
      <ChecklistCoreHeader />
      <ChecklistCoreBody />
      <ChecklistCoreFooter />
    </SidebarContainer>
  );
};

ChecklistCore.displayName = "ChecklistCore";
