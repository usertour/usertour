import { useThemeList } from '@/hooks/use-theme-list';
import { GoogleFontCss } from '@usertour/business-components';
import { PREVIEW_BASIC, defaultSettings } from '@usertour/constants';
import { RiArrowLeftSLine, RiArrowRightSLine, RiEyeLine } from '@usertour/icons';
import type {
  AnnouncementData,
  ContentVersion,
  PopupAnnouncement,
  Step,
  Theme,
} from '@usertour/types';
import { AnnouncementDistribution, AnnouncementPopupStyle, ContentDataType } from '@usertour/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ScaledPreviewContainer,
} from '@usertour/ui';
import {
  AnnouncementPopupBody,
  Popper,
  WidgetLocaleProvider,
  useSettingsStyles,
} from '@usertour/widget';
import { ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  BannerPreviewContent,
  ChecklistPreview,
  FlowPreview,
  LauncherPreview,
  ResourceCenterPreview,
} from '../../../shared/content-preview';

const noop = () => {
  // Preview interactions have no effect.
};

const useResolvedTheme = (themeId: string | null | undefined): Theme | undefined => {
  const { themeList } = useThemeList();
  return useMemo(() => themeList?.find((theme) => theme.id === themeId), [themeList, themeId]);
};

interface PreviewViewportProps {
  children: ReactNode;
}

// Non-interactive scaled stage — `inert` + pointer-events-none mirror the
// overview preview cards: the rendered buttons must not run their actions.
const PreviewViewport = (props: PreviewViewportProps) => {
  const { children } = props;
  return (
    <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-lg bg-muted/50 p-6">
      <div className="pointer-events-none [&_*]:pointer-events-none" {...({ inert: '' } as any)}>
        <ScaledPreviewContainer maxWidth={620} maxHeight={460}>
          {children}
        </ScaledPreviewContainer>
      </div>
    </div>
  );
};

interface PreviewSectionProps {
  label: string;
  children: ReactNode;
}

const PreviewSection = (props: PreviewSectionProps) => {
  const { label, children } = props;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Flow — one step at a time with a pager, themed per step.
// ---------------------------------------------------------------------------

interface FlowPreviewBodyProps {
  version: ContentVersion;
}

const FlowPreviewBody = (props: FlowPreviewBodyProps) => {
  const { version } = props;
  const [stepIndex, setStepIndex] = useState(0);
  const steps = (version.steps ?? []) as Step[];
  const currentStep = steps[stepIndex] as Step | undefined;
  const theme = useResolvedTheme(currentStep?.themeId ?? version.themeId);

  if (!currentStep || !theme) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <GoogleFontCss settings={theme.settings} />
      <PreviewViewport>
        <FlowPreview
          currentTheme={theme}
          currentStep={currentStep}
          currentVersion={version}
          currentStepIndex={stepIndex}
        />
      </PreviewViewport>
      {steps.length > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((index) => index - 1)}
          >
            <RiArrowLeftSLine className="h-4 w-4" />
          </Button>
          <span className="max-w-64 truncate">
            {stepIndex + 1}/{steps.length} · {currentStep.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={stepIndex === steps.length - 1}
            onClick={() => setStepIndex((index) => index + 1)}
          >
            <RiArrowRightSLine className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Announcement — the popup body is purely presentational, so hand-built
// PopupAnnouncement payloads render the translated fields exactly as the live
// widget would (same trick as the theme-builder preview). Intro and detail
// are separate surfaces, so they preview as separate sections.
// ---------------------------------------------------------------------------

interface AnnouncementPreviewBodyProps {
  version: ContentVersion;
}

const AnnouncementPreviewBody = (props: AnnouncementPreviewBodyProps) => {
  const { version } = props;
  const theme = useResolvedTheme(version.themeId);
  if (!theme) {
    return null;
  }
  return <AnnouncementPreviewContent version={version} theme={theme} />;
};

interface AnnouncementPreviewContentProps {
  version: ContentVersion;
  theme: Theme;
}

const AnnouncementPreviewContent = (props: AnnouncementPreviewContentProps) => {
  const { version, theme } = props;
  const { t } = useTranslation();
  const data = version.data as AnnouncementData;
  const isModal =
    data.distribution === AnnouncementDistribution.POPUP &&
    data.popupConfig?.style === AnnouncementPopupStyle.MODAL;
  const { globalStyle, themeSetting } = useSettingsStyles(
    theme.settings,
    isModal ? { type: 'modal' } : undefined,
  );
  const width = isModal
    ? (themeSetting?.announcement?.modalWidth ?? defaultSettings.announcement.modalWidth)
    : (themeSetting?.announcement?.bubbleWidth ?? defaultSettings.announcement.bubbleWidth);

  // `time: ''` hides the date row — it isn't translatable content.
  const intro = useMemo<PopupAnnouncement>(
    () => ({
      id: 'localization-preview',
      versionId: version.id,
      title: data.title,
      content: data.introContent ?? [],
      moreEnabled: data.enableReadMore,
      moreButtonText: data.readMoreLabel,
      level: data.distribution,
      time: '',
      moreContent: null,
      popupConfig: data.popupConfig ?? { style: AnnouncementPopupStyle.BUBBLE },
    }),
    [version.id, data],
  );
  // The detail page shows the title above the full content with no Read more;
  // the modal variant (h1 title, no unread dot) is the closest body layout.
  const detail = useMemo<PopupAnnouncement>(
    () => ({ ...intro, content: data.detailContent ?? [], moreEnabled: false }),
    [intro, data.detailContent],
  );

  return (
    <div className="flex flex-col gap-4">
      <GoogleFontCss settings={theme.settings} />
      <PreviewSection label={t('contents.localization.section.introContent')}>
        <PreviewViewport>
          <Popper open={true} zIndex={PREVIEW_BASIC} globalStyle={globalStyle}>
            <div style={{ width: `${width}px` }}>
              <AnnouncementPopupBody
                popup={intro}
                onDismiss={noop}
                onReadMore={noop}
                variant={isModal ? 'modal' : 'bubble'}
              />
            </div>
          </Popper>
        </PreviewViewport>
      </PreviewSection>
      {data.enableReadMore && (
        <PreviewSection label={t('contents.localization.section.detailContent')}>
          <PreviewViewport>
            <Popper open={true} zIndex={PREVIEW_BASIC} globalStyle={globalStyle}>
              <div style={{ width: `${width}px` }}>
                <AnnouncementPopupBody
                  popup={detail}
                  onDismiss={noop}
                  onReadMore={noop}
                  variant="modal"
                />
              </div>
            </Popper>
          </PreviewViewport>
        </PreviewSection>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Checklist / launcher / banner / resource center — the overview preview
// components already render straight from version.data.
// ---------------------------------------------------------------------------

interface VersionDataPreviewBodyProps {
  contentType: string;
  version: ContentVersion;
}

const VersionDataPreviewBody = (props: VersionDataPreviewBodyProps) => {
  const { contentType, version } = props;
  const theme = useResolvedTheme(version.themeId);

  if (!theme) {
    return null;
  }

  const preview = (() => {
    switch (contentType) {
      case ContentDataType.CHECKLIST:
        return <ChecklistPreview currentTheme={theme} currentVersion={version} />;
      case ContentDataType.LAUNCHER:
        return <LauncherPreview currentTheme={theme} currentVersion={version} />;
      case ContentDataType.BANNER:
        return <BannerPreviewContent currentTheme={theme} currentVersion={version} />;
      case ContentDataType.RESOURCE_CENTER:
        return <ResourceCenterPreview currentTheme={theme} currentVersion={version} />;
      default:
        return null;
    }
  })();

  if (!preview) {
    return null;
  }

  return (
    <>
      <GoogleFontCss settings={theme.settings} />
      <PreviewViewport>{preview}</PreviewViewport>
    </>
  );
};

// ---------------------------------------------------------------------------
// Dialog shell
// ---------------------------------------------------------------------------

export interface LocalizationPreviewDialogProps {
  contentType: string;
  /** Which language is being previewed — shown in the dialog title. */
  localizationName: string;
  /** Target locale code — the widget chrome in the preview follows it. */
  localeCode: string;
  /** Clones the version with the working translations merged in (delivery shape). */
  buildLocalizedVersion: () => ContentVersion;
}

export const LocalizationPreviewDialog = (props: LocalizationPreviewDialogProps) => {
  const { contentType, localizationName, localeCode, buildLocalizedVersion } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <RiEyeLine className="mr-1 h-4 w-4" />
          {t('contents.localization.previewButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t('contents.localization.previewTitle', { locale: localizationName })}
          </DialogTitle>
        </DialogHeader>
        {/* The widget chrome in the preview follows the previewed language,
            mirroring what a user with that locale would see. */}
        <WidgetLocaleProvider locale={localeCode}>
          <LocalizationPreviewBody
            contentType={contentType}
            buildLocalizedVersion={buildLocalizedVersion}
          />
        </WidgetLocaleProvider>
      </DialogContent>
    </Dialog>
  );
};

LocalizationPreviewDialog.displayName = 'LocalizationPreviewDialog';

interface LocalizationPreviewBodyProps {
  contentType: string;
  buildLocalizedVersion: () => ContentVersion;
}

const LocalizationPreviewBody = (props: LocalizationPreviewBodyProps) => {
  const { contentType, buildLocalizedVersion } = props;
  // Mounted only while the dialog is open, and the dialog blocks editing, so
  // one merge per open is enough.
  const version = useMemo(() => buildLocalizedVersion(), [buildLocalizedVersion]);

  if (contentType === ContentDataType.FLOW) {
    return <FlowPreviewBody version={version} />;
  }
  if (contentType === ContentDataType.ANNOUNCEMENT) {
    return <AnnouncementPreviewBody version={version} />;
  }
  return <VersionDataPreviewBody contentType={contentType} version={version} />;
};
