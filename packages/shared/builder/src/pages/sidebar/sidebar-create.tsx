import { PlusCircledIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { EXTENSION_SIDEBAR_POPPER } from '@usertour-ui/constants';
import { PopperPreview } from '@usertour-ui/shared-components';
import { createValue1, createValue2, createValue4 } from '@usertour-ui/shared-editor';
import { defaultStep } from '@usertour-ui/shared-utils';
import { useCallback } from 'react';
import { BuilderMode, useBuilderContext } from '../../contexts';

const contentList: any[] = [
  {
    // data: '[{"type":"paragraph","children":[{"text":"Hello, I an Lucky"}]}]',
    data: createValue1,
    type: 'tooltip',
    text: 'Tooltip',
    width: '240px',
    height: '98px',
    scale: 0.7,
  },
  {
    // data: '[{"type":"image","url":"https://assets.usertour.io/2918eea0-7daf-45c0-bc27-74a5ac2aca86/icon-theme-default-img (2).png","width":{"type":"percent","value":100},"children":[{"text":""}]},{"type":"paragraph","children":[{"text":"Track your favorites"}]}]',
    data: createValue4,
    type: 'modal',
    text: 'Modal',
    width: '240px',
    height: '240px',
    scale: 0.5,
  },
  {
    // data: '[{"type":"image","url":"https://assets.usertour.io/2918eea0-7daf-45c0-bc27-74a5ac2aca86/icon-theme-default-img (2).png","width":{"type":"percent","value":100},"children":[{"text":""}]},{"type":"paragraph","children":[{"text":"Track your favorites"}]}]',
    data: createValue2,
    type: 'hidden',
    text: 'Hidden',
    width: '240px',
    height: '240px',
    scale: 0.5,
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
    (type: string, content: any) => {
      if (!currentVersion) {
        return;
      }
      const index = currentVersion.steps?.length ?? 0;
      setCurrentStep({
        ...defaultStep,
        setting: {
          ...defaultStep.setting,
          width: type === 'tooltip' ? defaultStep.setting.width : 550,
        },
        type,
        name: 'Untitled',
        data: content,
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
    <Popover.Root modal={true}>
      <Popover.Trigger asChild>
        <Button className="w-full h-10" variant="secondary">
          <PlusCircledIcon className="mr-2" />
          Create
        </Button>
      </Popover.Trigger>
      <Popover.Anchor virtualRef={container} />
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-fit rounded-xl dark:border-none bg-background-900 p-4 text-popover-foreground shadow-md outline-none border border-background-400	"
          side="left"
          align="start"
          style={{ zIndex: zIndex + EXTENSION_SIDEBAR_POPPER }}
          alignOffset={40}
          sideOffset={2}
        >
          <h1 className="text-lg mb-3">Step Type</h1>
          <div className="grid grid-cols-2 gap-4">
            {currentTheme?.settings &&
              contentList.map((content, index) => {
                return (
                  <PopperPreview
                    settings={currentTheme?.settings}
                    scale={content.scale}
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
SidebarCreate.displayName = 'SidebarCreate';
