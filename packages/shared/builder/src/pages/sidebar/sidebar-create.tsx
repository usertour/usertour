import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { EXTENSION_SIDEBAR_POPPER } from '@usertour-packages/constants';
import { StepContentType, ContentEditorRoot } from '@usertour/types';
import { PopperPreview } from '../../components/preview';
import { getDefaultDataForType, getEmptyDataForType } from '../../utils/default-data';
import { defaultStep } from '@usertour/helpers';
import { useCallback, useMemo } from 'react';
import { BuilderMode, useBuilderContext } from '../../contexts';

interface ContentTypeConfig {
  data: ContentEditorRoot[];
  type: StepContentType;
  text: string;
  width: string;
  height: string;
}

interface SidebarCreateProps {
  container: React.MutableRefObject<HTMLDivElement | null>;
}

const CONTENT_TYPE_CONFIGS: Omit<ContentTypeConfig, 'data'>[] = [
  {
    type: StepContentType.BUBBLE,
    text: 'Speech bubble',
    width: '240px',
    height: '98px',
  },
  {
    type: StepContentType.TOOLTIP,
    text: 'Tooltip',
    width: '240px',
    height: '98px',
  },
  {
    type: StepContentType.MODAL,
    text: 'Modal',
    width: '300px',
    height: '300px',
  },
  {
    type: StepContentType.HIDDEN,
    text: 'Hidden',
    width: '240px',
    height: '240px',
  },
];

export const SidebarCreate = ({ container }: SidebarCreateProps) => {
  const {
    setCurrentIndex,
    setCurrentMode,
    currentVersion,
    currentTheme,
    zIndex,
    setCurrentStep,
    isWebBuilder,
  } = useBuilderContext();

  // Memoize content list to avoid recalculating on every render
  const contentList = useMemo<ContentTypeConfig[]>(() => {
    return CONTENT_TYPE_CONFIGS.map((config) => ({
      ...config,
      data: getDefaultDataForType(config.type),
    }));
  }, []);

  const handleCreateStep = useCallback(
    (type: string, _content?: unknown) => {
      if (!currentVersion) {
        return;
      }

      const index = currentVersion.steps?.length ?? 0;
      const emptyData = getEmptyDataForType();

      setCurrentStep({
        ...defaultStep,
        setting: {
          ...defaultStep.setting,
          // width is undefined by default (Auto - uses theme default)
        },
        type,
        name: 'Untitled',
        data: emptyData,
        sequence: index,
      });

      setCurrentIndex(index);

      // Determine the appropriate mode based on builder type and step type
      if (isWebBuilder) {
        setCurrentMode({ mode: BuilderMode.FLOW_STEP_DETAIL });
      } else {
        const mode =
          type === StepContentType.TOOLTIP
            ? BuilderMode.ELEMENT_SELECTOR
            : BuilderMode.FLOW_STEP_DETAIL;
        setCurrentMode({ mode });
      }
    },
    [currentVersion, setCurrentStep, setCurrentIndex, setCurrentMode, isWebBuilder],
  );

  const popoverZIndex = useMemo(() => zIndex + EXTENSION_SIDEBAR_POPPER, [zIndex]);

  const shouldShowContentList = Boolean(currentTheme?.settings);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="w-full h-10" variant="secondary">
          <PlusCircledIcon className="mr-2" />
          Create
        </Button>
      </PopoverTrigger>
      <PopoverAnchor virtualRef={container} />
      <PopoverContent
        className="w-fit rounded-xl dark:border-none bg-background-900 border-background-400"
        side="left"
        align="start"
        style={{ zIndex: popoverZIndex }}
        alignOffset={40}
        sideOffset={2}
      >
        <h1 className="text-lg mb-3">Step type</h1>
        {shouldShowContentList && (
          <div className="grid grid-cols-2 gap-4">
            {contentList.map((content) => (
              <PopperPreview
                key={content.type}
                type={content.type}
                width={content.width}
                height={content.height}
                data={content.data}
                text={content.text}
                onClick={handleCreateStep}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

SidebarCreate.displayName = 'SidebarCreate';
