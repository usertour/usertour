import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { EXTENSION_SIDEBAR_POPPER } from '@usertour-packages/constants';
import { StepContentType } from '@usertour/types';
import { PopperPreview } from '../../components/preview';
import { getDefaultDataForType, getEmptyDataForType } from '../../utils/default-data';
import { defaultStep } from '@usertour/helpers';
import { useCallback } from 'react';
import { BuilderMode, useBuilderContext } from '../../contexts';

const contentList: any[] = [
  {
    data: getDefaultDataForType(StepContentType.BUBBLE),
    type: StepContentType.BUBBLE,
    text: 'Speech bubble',
    width: '240px',
    height: '98px',
  },
  {
    data: getDefaultDataForType(StepContentType.TOOLTIP),
    type: StepContentType.TOOLTIP,
    text: 'Tooltip',
    width: '240px',
    height: '98px',
  },
  {
    data: getDefaultDataForType(StepContentType.MODAL),
    type: StepContentType.MODAL,
    text: 'Modal',
    width: '300px',
    height: '300px',
  },
  {
    data: getDefaultDataForType(StepContentType.HIDDEN),
    type: StepContentType.HIDDEN,
    text: 'Hidden',
    width: '240px',
    height: '240px',
  },
];

interface SidebarCreateProps {
  container: React.MutableRefObject<HTMLDivElement | null>;
}
export const SidebarCreate = (props: SidebarCreateProps) => {
  const {
    setCurrentIndex,
    setCurrentMode,
    currentVersion,
    currentTheme,
    zIndex,
    setCurrentStep,
    isWebBuilder,
  } = useBuilderContext();
  const { container } = props;

  const handleCreateStep = useCallback(
    (type: string, _content: any) => {
      if (!currentVersion) {
        return;
      }
      const index = currentVersion.steps?.length ?? 0;
      // Use empty data when creating, not the preview data
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
      if (isWebBuilder) {
        setCurrentMode({ mode: BuilderMode.FLOW_STEP_DETAIL });
      } else {
        if (type === 'tooltip') {
          setCurrentMode({ mode: BuilderMode.ELEMENT_SELECTOR });
        } else {
          setCurrentMode({ mode: BuilderMode.FLOW_STEP_DETAIL });
        }
      }
    },
    [currentVersion],
  );

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
        style={{ zIndex: zIndex + EXTENSION_SIDEBAR_POPPER }}
        alignOffset={40}
        sideOffset={2}
      >
        <h1 className="text-lg mb-3">Step type</h1>
        <div className="grid grid-cols-2 gap-4">
          {currentTheme?.settings &&
            contentList.map((content, index) => {
              return (
                <PopperPreview
                  type={content.type}
                  width={content.width}
                  height={content.height}
                  key={index}
                  data={content.data}
                  text={content.text}
                  onClick={handleCreateStep}
                />
              );
            })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
SidebarCreate.displayName = 'SidebarCreate';
