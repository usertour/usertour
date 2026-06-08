import { BUILDER_Z } from '@usertour/constants';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@usertour/ui';
import { RiArrowDownSLine, RiSettings3Line, TooltipIcon } from '@usertour/icons';
import { Actions } from '@usertour/editor';
import { useTranslation } from 'react-i18next';
import {
  ContentActionsItemType,
  LauncherActionType,
  LauncherBehaviorType,
  LauncherTriggerElement,
  LauncherTriggerEvent,
  RulesCondition,
} from '@usertour/types';
import { useCallback } from 'react';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

interface TriggerOption {
  value: string;
  label: string;
}

interface TriggerDropdownProps {
  value: string;
  options: TriggerOption[];
  onChange: (value: string) => void;
}

const TriggerDropdown = (props: TriggerDropdownProps) => {
  const { value, options, onChange } = props;
  const selected = options.find((option) => option.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer w-fit">
          <span>{selected?.label ?? value}</span>
          <RiArrowDownSLine size={16} className="opacity-70" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" style={{ zIndex: BUILDER_Z.popover }}>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const LauncherBehavior = () => {
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const { contents } = useContentList();
  const { attributeList } = useAttributeList();
  const {
    data: localData,
    updateDataBehavior: updateLocalDataBehavior,
    gotoLauncherTooltip,
  } = useLauncherEditor();
  const { t } = useTranslation();

  const triggerElementOptions: TriggerOption[] = [
    {
      value: LauncherTriggerElement.LAUNCHER,
      label: t('contentBuilder.launcher.behaviorEditor.triggerElement.launcher'),
    },
    {
      value: LauncherTriggerElement.TARGET,
      label: t('contentBuilder.launcher.behaviorEditor.triggerElement.targetElement'),
    },
    {
      value: LauncherTriggerElement.TARGET_OR_LAUNCHER,
      label: t('contentBuilder.launcher.behaviorEditor.triggerElement.targetOrLauncher'),
    },
  ];
  const triggerEventOptions: TriggerOption[] = [
    {
      value: LauncherTriggerEvent.HOVERED,
      label: t('contentBuilder.launcher.behaviorEditor.triggerEvent.hovered'),
    },
    {
      value: LauncherTriggerEvent.CLICKED,
      label: t('contentBuilder.launcher.behaviorEditor.triggerEvent.clicked'),
    },
  ];

  const handleStateChange = useCallback(
    (key: keyof LauncherBehaviorType) => (value: string | RulesCondition[]) => {
      updateLocalDataBehavior({
        [key]: value,
      });
    },
    [updateLocalDataBehavior],
  );

  const handleSwitchToTooltip = useCallback(() => {
    gotoLauncherTooltip();
  }, [gotoLauncherTooltip]);

  return (
    <FieldSection title={t('contentBuilder.launcher.behavior')}>
      <div className="flex flex-col bg-surface p-3.5 rounded-lg space-y-1">
        <div className="text-sm">{t('contentBuilder.launcher.behaviorEditor.when')}</div>
        <div className="flex flex-row space-x-1 items-center">
          <TriggerDropdown
            value={localData.behavior.triggerElement}
            options={triggerElementOptions}
            onChange={handleStateChange('triggerElement')}
          />
          <span className="text-sm">{t('contentBuilder.launcher.behaviorEditor.is')}</span>
          <TriggerDropdown
            value={localData.behavior.triggerEvent}
            options={triggerEventOptions}
            onChange={handleStateChange('triggerEvent')}
          />
        </div>
        <div className="text-sm">{t('contentBuilder.launcher.behaviorEditor.thenLabel')}</div>
        <Tabs
          defaultValue={localData.behavior.actionType}
          onValueChange={handleStateChange('actionType')}
        >
          <TabsList className="grid w-full grid-cols-2 bg-background">
            <TabsTrigger value="show-tooltip" variant="primary">
              {t('contentBuilder.launcher.behaviorEditor.showTooltip')}
            </TabsTrigger>
            <TabsTrigger value="perform-action" variant="primary">
              {t('contentBuilder.launcher.behaviorEditor.performAction')}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value={LauncherActionType.SHOW_TOOLTIP}
            className="bg-background p-2 rounded-lg "
          >
            <div
              className="flex flex-row items-center justify-between cursor-pointer h-8"
              onClick={handleSwitchToTooltip}
            >
              <div className="flex flex-row space-x-1 items-center">
                <TooltipIcon className="h-4 w-4 mt-1 opacity-70" />
                <span className="text-sm">
                  {t('contentBuilder.launcher.behaviorEditor.tooltipSetting')}
                </span>
              </div>
              <RiSettings3Line className="h-4 w-4 opacity-70" />
            </div>
          </TabsContent>
          <TabsContent
            value={LauncherActionType.PERFORM_ACTION}
            className="bg-background p-2 rounded-lg"
          >
            <Actions
              baseZIndex={BUILDER_Z.popover}
              currentStep={undefined}
              currentVersion={currentVersion}
              onChange={handleStateChange('actions')}
              conditions={localData.behavior.actions}
              attributes={attributeList}
              contents={contents}
              filterItems={[
                ContentActionsItemType.LAUNCHER_DISMIS,
                ContentActionsItemType.JAVASCRIPT_EVALUATE,
                ContentActionsItemType.PAGE_NAVIGATE,
                ContentActionsItemType.FLOW_START,
              ]}
              t={t}
            />
          </TabsContent>
        </Tabs>
      </div>
    </FieldSection>
  );
};
LauncherBehavior.displayName = 'LauncherBehavior';
