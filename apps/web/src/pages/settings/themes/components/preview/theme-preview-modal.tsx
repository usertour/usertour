import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import * as SharedPopper from '@usertour-ui/sdk';
import { ContentEditorRoot, ContentEditorSerialize } from '@usertour-ui/shared-editor';

export const ThemePreviewModal = (props: { contents: ContentEditorRoot[] }) => {
  const { contents } = props;
  const { settings, customStyle } = useThemeDetailContext();

  return (
    <div className="h-full w-full" style={{ transform: 'scale(1)' }}>
      <SharedPopper.Popper open={true} zIndex={1111} globalStyle={customStyle}>
        <SharedPopper.PopperModalContentPotal
          position={'center'}
          enabledBackdrop={true}
          width={`${settings?.modal.width}px`}
        >
          <SharedPopper.PopperContent>
            <SharedPopper.PopperClose />
            <ContentEditorSerialize contents={contents} />
            <SharedPopper.PopperMadeWith />
            <SharedPopper.PopperProgress width={60} />
          </SharedPopper.PopperContent>
        </SharedPopper.PopperModalContentPotal>
      </SharedPopper.Popper>
    </div>
  );
};

ThemePreviewModal.displayName = 'ThemePreviewModal';
