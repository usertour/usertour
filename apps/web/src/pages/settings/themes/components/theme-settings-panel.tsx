import { ThemeTypesSetting } from '@usertour-ui/types';
import { convertSettings } from '@/utils/convert-settings';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { GoogleFontCss } from '@usertour-ui/shared-components';
import { cn } from '@usertour-ui/ui-utils';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { createContext, forwardRef, useContext, useEffect, useState } from 'react';
import { ThemeSettingsBackdrop } from './settings/theme-settings-backdrop';
import { ThemeSettingsBasicColor } from './settings/theme-settings-basic-color';
import { ThemeSettingsBeacon } from './settings/theme-settings-beacon';
import { ThemeSettingsBorder } from './settings/theme-settings-border';
import { ThemeSettingsButtons } from './settings/theme-settings-buttons';
import { ThemeSettingsChecklist } from './settings/theme-settings-checklist';
import { ThemeSettingsChecklistLauncher } from './settings/theme-settings-checklist-launcher';
import { ThemeSettingsFont } from './settings/theme-settings-font';
import { ThemeSettingsLauncherIcons } from './settings/theme-settings-launcher-icons';
import { ThemeSettingsModal } from './settings/theme-settings-modal';
import { ThemeSettingsProgress } from './settings/theme-settings-progress';
import { ThemeSettingsSurvey } from './settings/theme-settings-survey';
import { ThemeSettingsTooltip } from './settings/theme-settings-tooltip';
import { ThemeSettingsXbutton } from './settings/theme-settings-xbutton';
import { SubThemeModal } from './sub-theme-modal';
import { Button } from '@usertour-ui/button';

const AccordionItem = forwardRef(({ children, className, ...props }: any, forwardedRef) => (
  <Accordion.Item
    className={cn(
      'overflow-hidden first:mt-0 first:rounded-t-lg last:rounded-b-lg border-b border-blue-100 last:border-none',
      className,
    )}
    {...props}
    ref={forwardedRef}
  >
    {children}
  </Accordion.Item>
));

const AccordionTrigger = forwardRef(({ children, className, ...props }: any, forwardedRef) => (
  <Accordion.Header className="flex">
    <Accordion.Trigger
      className={cn(
        'text-foreground bg-white hover:bg-blue-50 data-[state=open]:bg-blue-50 group flex flex-1 items-center justify-between px-5 text-[15px] leading-none h-[45px] outline-none cursor-pointer',
        className,
      )}
      {...props}
      ref={forwardedRef}
    >
      {children}
      <ChevronDownIcon
        className="text-foreground ease-[cubic-bezier(0.87,_0,_0.13,_1)] transition-transform duration-300 group-data-[state=open]:rotate-180"
        aria-hidden
      />
    </Accordion.Trigger>
  </Accordion.Header>
));

const AccordionContent = forwardRef(({ children, className, ...props }: any, forwardedRef) => (
  <Accordion.Content
    className={cn(
      'text-foreground bg-background data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp overflow-hidden text-[15px]',
      className,
    )}
    {...props}
    ref={forwardedRef}
  >
    {children}
  </Accordion.Content>
));

interface ThemeSettingsContextProps {
  setSettings: React.Dispatch<React.SetStateAction<ThemeTypesSetting>>;
  settings: ThemeTypesSetting;
  finalSettings: ThemeTypesSetting | null;
}

const ThemeSettingsContext = createContext<ThemeSettingsContextProps | null>(null);

export function useThemeSettingsContext(): ThemeSettingsContextProps {
  const context = useContext(ThemeSettingsContext);
  if (!context) {
    throw new Error('useThemeSettingsContext must be used within a ThemeSettingsPanel.');
  }
  return context;
}

interface ThemeSettingsPanelProps {
  settings: ThemeTypesSetting;
  defaultSettings: ThemeTypesSetting;
  onSettingsChange: (settings: ThemeTypesSetting) => void;
  className?: string;
  enableScroll?: boolean;
}

export const ThemeSettingsPanel = ({
  settings: initialSettings,
  onSettingsChange,
  className,
  enableScroll = false,
}: ThemeSettingsPanelProps) => {
  const [settings, setSettings] = useState<ThemeTypesSetting>(initialSettings);
  const [finalSettings, setFinalSettings] = useState<ThemeTypesSetting | null>(null);
  // Update internal settings when external settings change
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    if (settings) {
      setFinalSettings(convertSettings(settings));
      onSettingsChange(settings);
    }
  }, [settings, onSettingsChange]);

  const value = { settings, setSettings, finalSettings };

  const accordionContent = (
    <>
      <AccordionItem value="basic">
        <AccordionTrigger>Base colors</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsBasicColor />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="font">
        <AccordionTrigger>Font</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsFont />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="border">
        <AccordionTrigger>Chrome border</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsBorder />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="xbutton">
        <AccordionTrigger>X Button</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsXbutton />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="progress">
        <AccordionTrigger>Progress bar</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsProgress />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="buttons">
        <AccordionTrigger>Buttons</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsButtons />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="tooptip">
        <AccordionTrigger>Tooltip</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsTooltip />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="modal">
        <AccordionTrigger>Modal</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsModal />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="survey">
        <AccordionTrigger>Survey</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsSurvey />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="checklist">
        <AccordionTrigger>Checklist</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsChecklist />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="checklist-launcher">
        <AccordionTrigger>Checklist launcher</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsChecklistLauncher />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="launcher-beacon">
        <AccordionTrigger>Launcher beacons</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsBeacon />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="launcher-icons">
        <AccordionTrigger>Launcher icons</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsLauncherIcons />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="backdrop">
        <AccordionTrigger>Backdrop</AccordionTrigger>
        <AccordionContent>
          <ThemeSettingsBackdrop />
        </AccordionContent>
      </AccordionItem>
    </>
  );

  return (
    <ThemeSettingsContext.Provider value={value}>
      <GoogleFontCss settings={settings} />
      {enableScroll ? (
        <div className={cn('shadow bg-white rounded-lg w-[350px] h-full flex flex-col', className)}>
          <ScrollArea className="flex-1">
            <Accordion.Root type="multiple">
              <div className="p-10 border-b border-blue-100">
                <Button>DDD</Button>
              </div>
              {accordionContent}
            </Accordion.Root>
          </ScrollArea>
        </div>
      ) : (
        <Accordion.Root
          type="multiple"
          className={cn('shadow bg-white rounded-lg w-[350px]', className)}
        >
          <div className="p-10 border-b border-blue-100">
            <SubThemeModal />
          </div>
          {accordionContent}
        </Accordion.Root>
      )}
    </ThemeSettingsContext.Provider>
  );
};

ThemeSettingsPanel.displayName = 'ThemeSettingsPanel';
