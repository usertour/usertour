import { Attribute, ThemeTypesSetting, ThemeVariation } from '@usertour/types';
import { convertSettings } from '@/utils/convert-settings';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { GoogleFontCss } from '@usertour-packages/shared-components';
import { cn } from '@usertour-packages/tailwind';
import { createContext, forwardRef, useContext, useMemo, useCallback, ReactNode } from 'react';
import { ThemeSettingsBackdrop } from './settings/theme-settings-backdrop';
import { ThemeSettingsBasicColor } from './settings/theme-settings-basic-color';
import { ThemeSettingsBeacon } from './settings/theme-settings-beacon';
import { ThemeSettingsBorder } from './settings/theme-settings-border';
import { ThemeSettingsButtons } from './settings/theme-settings-buttons';
import { ThemeSettingsChecklist } from './settings/theme-settings-checklist';
import { ThemeSettingsChecklistLauncher } from './settings/theme-settings-checklist-launcher';
import { ThemeSettingsFont } from './settings/theme-settings-font';
import { ThemeSettingsLauncherIcons } from './settings/theme-settings-launcher-icons';
import { ThemeSettingsLauncherButtons } from './settings/theme-settings-launcher-buttons';
import { ThemeSettingsModal } from './settings/theme-settings-modal';
import { ThemeSettingsProgress } from './settings/theme-settings-progress';
import { ThemeSettingsSurvey } from './settings/theme-settings-survey';
import { ThemeSettingsTooltip } from './settings/theme-settings-tooltip';
import { ThemeSettingsXbutton } from './settings/theme-settings-xbutton';
import { ThemeSettingsBubble } from './settings/theme-settings-bubble';
import { ConditionalVariationsPanel } from './conditional-variations-panel';

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
  isViewOnly: boolean;
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
  children?: ReactNode;
  isViewOnly?: boolean;
}

// The main container component that provides context and structure
export const ThemeSettingsPanel = ({
  settings,
  onSettingsChange,
  className,
  children,
  isViewOnly = false,
}: ThemeSettingsPanelProps) => {
  // Calculate finalSettings using useMemo
  const finalSettings = useMemo(() => {
    if (!settings) {
      return null;
    }
    return convertSettings(settings);
  }, [settings]);

  // Simple wrapper that calls onSettingsChange
  const setSettings = useCallback(
    (updater: React.SetStateAction<ThemeTypesSetting>) => {
      const newSettings = typeof updater === 'function' ? updater(settings) : updater;
      if (newSettings) {
        onSettingsChange(newSettings);
      }
    },
    [settings, onSettingsChange],
  );

  const value = { settings, setSettings, finalSettings, isViewOnly };

  return (
    <ThemeSettingsContext.Provider value={value}>
      <GoogleFontCss settings={settings} />
      <div className={cn('shadow bg-white rounded-lg w-[350px]', className)}>
        <Accordion.Root type="multiple">{children}</Accordion.Root>
      </div>
    </ThemeSettingsContext.Provider>
  );
};

// Accordion content for reuse
export const ThemeSettingsAccordionContent = () => (
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
    <AccordionItem value="bubble">
      <AccordionTrigger>Bubble</AccordionTrigger>
      <AccordionContent>
        <ThemeSettingsBubble />
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
    <AccordionItem value="launcher-buttons">
      <AccordionTrigger>Launcher buttons</AccordionTrigger>
      <AccordionContent>
        <ThemeSettingsLauncherButtons />
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

// Default panel for regular theme settings
export const ThemeSettingsDefaultPanel = ({
  isViewOnly = false,
  settings,
  defaultSettings,
  onSettingsChange,
  className,
  attributeList,
  variations = [],
  onVariationsChange,
  showConditionalVariations = true,
}: {
  isViewOnly?: boolean;
  settings: ThemeTypesSetting;
  defaultSettings: ThemeTypesSetting;
  onSettingsChange: (settings: ThemeTypesSetting) => void;
  className?: string;
  attributeList?: Attribute[];
  variations?: ThemeVariation[];
  onVariationsChange?: (variations: ThemeVariation[]) => void;
  showConditionalVariations?: boolean;
}) => (
  <ThemeSettingsPanel
    settings={settings}
    defaultSettings={defaultSettings}
    onSettingsChange={onSettingsChange}
    className={className}
    isViewOnly={isViewOnly}
  >
    {showConditionalVariations && (
      <div className="p-10 border-b border-blue-100">
        <ConditionalVariationsPanel
          variations={variations}
          onVariationsChange={onVariationsChange}
          attributeList={attributeList}
          isViewOnly={isViewOnly}
        />
      </div>
    )}
    <ThemeSettingsAccordionContent />
  </ThemeSettingsPanel>
);

ThemeSettingsPanel.displayName = 'ThemeSettingsPanel';
