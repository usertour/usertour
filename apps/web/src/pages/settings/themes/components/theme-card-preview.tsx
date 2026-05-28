import { useAppContext } from '@/contexts/app-context';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useListThemesQuery } from '@usertour/hooks';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import * as SharedPopper from '@usertour/widget';
import { ContentEditorSerialize, useSettingsStyles } from '@usertour/widget';
import { GoogleFontCss } from '@usertour/business-components';
import { ScaledPreviewContainer, Button } from '@usertour/ui';
import { Theme } from '@usertour/types';
import { PREVIEW_BASIC } from '@usertour/constants';
import { memo, MouseEvent, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LIST_PREVIEW_CONTENT } from '../constants/preview-contents';
import { ThemeEditDropdownMenu } from './theme-edit-dropdown-menu';

type ThemeCardPreviewProps = {
  theme: Theme;
};
export const ThemeCardPreview = memo((props: ThemeCardPreviewProps) => {
  const { theme } = props;
  const containerRef = useRef(null);

  const { project, isViewOnly } = useAppContext();
  const { refetch } = useListThemesQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
  const { globalStyle, themeSetting } = useSettingsStyles(theme.settings);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handleOnClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current as any;
      if (el.contains(e.target) && project) {
        navigate(`/project/${project.id}/settings/theme/${theme.id}`);
      }
    },
    [project, navigate, theme.id],
  );

  const handleOnSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <>
      <GoogleFontCss settings={themeSetting} />
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
                {t('settings.themes.defaultBadge')}
              </span>
            )}
          </div>
          <ThemeEditDropdownMenu theme={theme} onSubmit={handleOnSuccess} disabled={isViewOnly}>
            <Button variant={'ghost'} size={'icon'}>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </ThemeEditDropdownMenu>
        </div>
        <div
          className="flex justify-center items-center h-40 flex-col overflow-hidden"
          {...({ inert: '' } as any)}
        >
          <ScaledPreviewContainer className="origin-[center_center]" maxWidth={260} maxHeight={140}>
            <SharedPopper.Popper open={true} zIndex={PREVIEW_BASIC} globalStyle={globalStyle}>
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
                <ContentEditorSerialize contents={LIST_PREVIEW_CONTENT} />
              </SharedPopper.PopperStaticContent>
            </SharedPopper.Popper>
          </ScaledPreviewContainer>
        </div>
      </div>
    </>
  );
});

ThemeCardPreview.displayName = 'ThemeCardPreview';
