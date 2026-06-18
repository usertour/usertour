import { useAppContext } from '@/contexts/app-context';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import * as SharedPopper from '@usertour/widget';
import { ContentEditorSerialize, useSettingsStyles } from '@usertour/widget';
import { GoogleFontCss } from '@usertour/business-components';
import { ScaledPreviewContainer, Button } from '@usertour/ui';
import { cn } from '@usertour/tailwind';
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

  return (
    <>
      <GoogleFontCss settings={themeSetting} />
      {/* Visual language matches the content list card (see data-table.tsx):
          light lifts off the page with a soft shadow (no border), dark is a
          solid raised-surface block split by a hairline divider. Hover deepens
          the drop shadow in light; dark can't (shadow is invisible on
          near-black) so it lightens the surface a step instead — neither lifts.
          The preview area is dark:bg-transparent (it would otherwise re-declare
          surface-raised) so the dark hover-lighten shows through the whole card,
          not just the header. Layout keeps theme's name-on-top header — every
          preview renders the same sample content (only the styling differs), so
          the name, not the preview, is how you tell themes apart; it leads.

          The resting shadow leads with a tight, 0-offset ambient layer: the
          header is white on a white page, so a purely downward drop shadow
          leaves the card's TOP edge undefined and the header dissolves into the
          page. The ambient layer wraps all four edges (including the top) so
          the card reads as a block; low blur keeps it from haloing outward. The
          hover shadow keeps this ambient layer too, so the top edge holds while
          the drop deepens. */}
      <div
        ref={containerRef}
        onClick={handleOnClick}
        className={cn(
          'relative flex h-52 cursor-pointer flex-col overflow-hidden rounded-xl bg-card dark:bg-surface-raised',
          'shadow-[0_0_3px_rgba(16,24,40,0.07),0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.06)] dark:shadow-none',
          'transition-[box-shadow,background-color] duration-200',
          'hover:shadow-[0_0_3px_rgba(16,24,40,0.07),0_6px_20px_rgba(16,24,40,0.12)] dark:hover:shadow-none',
          'dark:hover:bg-surface-raised-hover',
        )}
      >
        <div className="flex flex-none items-center justify-between gap-2 px-4 py-3 dark:border-b dark:border-white/[0.06]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{theme.name}</span>
            {theme.isDefault && (
              <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                {t('settings.themes.defaultBadge')}
              </span>
            )}
          </div>
          <ThemeEditDropdownMenu theme={theme} onSubmit={() => {}} disabled={isViewOnly}>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1.5 size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </ThemeEditDropdownMenu>
        </div>
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-muted dark:bg-transparent"
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
