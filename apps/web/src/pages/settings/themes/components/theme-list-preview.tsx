import { useAppContext } from '@/contexts/app-context';
import { useThemeListContext } from '@/contexts/theme-list-context';
import { ThemeTypesSetting } from '@/types/theme-settings';
import { convertSettings, convertToCssVars } from '@/utils/convert-settings';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import * as SharedPopper from '@usertour-ui/sdk';
import { GoogleFontCss } from '@usertour-ui/shared-components';
import { ContentEditorSerialize, createValue5 } from '@usertour-ui/shared-editor';
import { Theme } from '@usertour-ui/types';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeEditDropdownMenu } from './theme-edit-dropmenu';

type ThemeListPreviewProps = {
  theme: Theme;
};
export const ThemeListPreview = (props: ThemeListPreviewProps) => {
  const { theme } = props;
  const containerRef = useRef(null);

  const { refetch } = useThemeListContext();
  const { project, isViewOnly } = useAppContext();
  const [settings] = useState<ThemeTypesSetting>(theme.settings);
  const navigate = useNavigate();
  const handleOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current as any;
    if (el.contains(e.target) && project) {
      navigate(`/project/${project.id}/settings/theme/${theme.id}`);
    }
  };

  const handleOnSuccess = () => {
    refetch();
  };

  return (
    <>
      <GoogleFontCss settings={settings} />
      <div
        className="h-52 min-w-80 bg-white rounded-lg border border-gray-100 hover:border-white dark:border-gray-800 dark:hover:border-gray-700 hover:shadow-lg dark:hover:shadow-lg-light dark:bg-gray-900 cursor-pointer"
        ref={containerRef}
        onClick={handleOnClick}
      >
        <div className="bg-slate-50 dark:bg-gray-800 rounded-t-md py-2.5 px-5 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-row grow space-x-2">
            <span className="text-base font-medium text-gray-900 dark:text-white max-w-40	truncate ...">
              {theme.name}
            </span>
            {theme.isDefault && (
              <span className="bg-primary px-1.5 py-0.5 rounded text-sm font-normal text-primary-foreground">
                Default
              </span>
            )}
          </div>
          <ThemeEditDropdownMenu theme={theme} onSubmit={handleOnSuccess} disabled={isViewOnly}>
            <DotsHorizontalIcon className="h-4 w-4" />
          </ThemeEditDropdownMenu>
        </div>
        <div className="flex justify-center items-center h-40 flex-col ">
          <SharedPopper.Popper
            open={true}
            zIndex={1}
            globalStyle={convertToCssVars(convertSettings(settings))}
          >
            <SharedPopper.PopperStaticContent
              arrowSize={{
                width: 20,
                height: 10,
              }}
              side={'top'}
              align={'center'}
              showArrow={false}
              width={'280px'}
              height={'auto'}
            >
              <SharedPopper.PopperClose />
              <ContentEditorSerialize contents={createValue5 as any} />
            </SharedPopper.PopperStaticContent>
          </SharedPopper.Popper>
        </div>
      </div>
    </>
  );
};

ThemeListPreview.displayName = 'ThemeListPreview';
