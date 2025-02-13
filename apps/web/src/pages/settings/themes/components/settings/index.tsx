import { ThemeTypesSetting } from '@/types/theme-settings';
import { convertSettings } from '@/utils/convert-settings';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { GoogleFontCss } from '@usertour-ui/shared-components';
import { cn } from '@usertour-ui/ui-utils';
import { createContext, forwardRef, useContext, useEffect, useState } from 'react';
import { ThemeSettingsBackdrop } from './theme-settings-backdrop';
import { ThemeSettingsBasicColor } from './theme-settings-basic-color';
import { ThemeSettingsBeacon } from './theme-settings-beacon';
import { ThemeSettingsBorder } from './theme-settings-border';
import { ThemeSettingsButtons } from './theme-settings-buttons';
import { ThemeSettingsChecklist } from './theme-settings-checklist';
import { ThemeSettingsChecklistLauncher } from './theme-settings-checklist-launcher';
import { ThemeSettingsFont } from './theme-settings-font';
import { ThemeSettingsLauncherIcons } from './theme-settings-launcher-icons';
import { ThemeSettingsModal } from './theme-settings-modal';
import { ThemeSettingsProgress } from './theme-settings-progress';
import { ThemeSettingsSurvey } from './theme-settings-survey';
import { ThemeSettingsTooltip } from './theme-settings-tooltip';
import { ThemeSettingsXbutton } from './theme-settings-xbutton';

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
    throw new Error('useThemeSettingsContext must be used within a ThemeSettingsSettingsProvider.');
  }
  return context;
}

interface ThemeSettingsProps {
  onChange: (settings: ThemeTypesSetting) => void;
  defaultSettings: ThemeTypesSetting;
}
export const ThemeSettings = (props: ThemeSettingsProps) => {
  const { onChange, defaultSettings } = props;
  const [settings, setSettings] = useState<ThemeTypesSetting>(defaultSettings);
  const [finalSettings, setFinalSettings] = useState<ThemeTypesSetting | null>(null);

  useEffect(() => {
    if (settings) {
      setFinalSettings(convertSettings(settings));
      onChange(settings);
    }
  }, [settings]);

  const value = { settings, setSettings, finalSettings };
  return (
    <ThemeSettingsContext.Provider value={value}>
      <GoogleFontCss settings={settings} />
      <Accordion.Root
        type="multiple"
        defaultValue={['item-1']}
        className="shadow bg-white rounded-lg w-[350px] "
      >
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
      </Accordion.Root>
    </ThemeSettingsContext.Provider>
  );
};

ThemeSettings.displayName = 'ThemeSettings';
