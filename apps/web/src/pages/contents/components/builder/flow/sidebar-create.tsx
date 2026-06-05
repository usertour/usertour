import { Button, Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@usertour/ui';
import { RiAddCircleLine } from '@usertour/icons';
import { EXTENSION_SIDEBAR_POPPER } from '@usertour/constants';
import { StepContentType, ContentEditorRoot } from '@usertour/types';
import { PopperPreview } from '@/pages/contents/components/builder/components/preview';
import { getDefaultDataForType } from '@/pages/contents/components/builder/utils/default-data';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuilderConfig } from '@/pages/contents/components/builder/core';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { useFlowEditor } from '@/pages/contents/components/builder/flow/use-flow-editor';

interface ContentTypeConfig {
  data: ContentEditorRoot[];
  type: StepContentType;
  textKey: string;
  width: string;
  height: string;
}

interface SidebarCreateProps {
  container: React.MutableRefObject<HTMLDivElement | null>;
}

const CONTENT_TYPE_CONFIGS: Omit<ContentTypeConfig, 'data'>[] = [
  {
    type: StepContentType.BUBBLE,
    textKey: 'contentBuilder.flow.stepType.bubble',
    width: '240px',
    height: '98px',
  },
  {
    type: StepContentType.TOOLTIP,
    textKey: 'contentBuilder.flow.stepType.tooltip',
    width: '240px',
    height: '98px',
  },
  {
    type: StepContentType.MODAL,
    textKey: 'contentBuilder.flow.stepType.modal',
    width: '300px',
    height: '300px',
  },
  {
    type: StepContentType.HIDDEN,
    textKey: 'contentBuilder.flow.stepType.hidden',
    width: '240px',
    height: '240px',
  },
];

export const SidebarCreate = (props: SidebarCreateProps) => {
  const { container } = props;
  const { t } = useTranslation();
  const { zIndex } = useBuilderConfig();
  // version-level theme (overview has no current step). useCurrentTheme falls
  // back to currentVersion.themeId when there's no step override.
  const currentTheme = useCurrentTheme();
  const { startCreateStep } = useFlowEditor();

  // Memoize content list to avoid recalculating on every render
  const contentList = useMemo<ContentTypeConfig[]>(() => {
    return CONTENT_TYPE_CONFIGS.map((config) => ({
      ...config,
      data: getDefaultDataForType(config.type),
    }));
  }, []);

  const popoverZIndex = useMemo(() => zIndex + EXTENSION_SIDEBAR_POPPER, [zIndex]);

  const shouldShowContentList = Boolean(currentTheme?.settings);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="w-full h-10" variant="secondary">
          <RiAddCircleLine className="mr-2 size-4 opacity-70" />
          {t('contentBuilder.flow.create')}
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
        <h1 className="text-lg mb-3">{t('contentBuilder.flow.stepTypeTitle')}</h1>
        {shouldShowContentList && (
          <div className="grid grid-cols-2 gap-4">
            {contentList.map((content) => (
              <PopperPreview
                key={content.type}
                type={content.type}
                width={content.width}
                height={content.height}
                data={content.data}
                text={t(content.textKey)}
                onClick={startCreateStep}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

SidebarCreate.displayName = 'SidebarCreate';
