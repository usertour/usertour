import { DEFAULT_EMBED_DATA } from '@usertour/constants';
import {
  ContentEditorSerialize,
  EmbedPreview as EmbedWidget,
  EmbedRoot,
  InlineContainer,
} from '@usertour/widget';
import type { ContentEditorRoot, ThemeTypesSetting } from '@usertour/types';

export interface EmbedPreviewProps {
  contents: ContentEditorRoot[];
  settings: ThemeTypesSetting;
  customStyle?: string;
}

// The embed sits between two blocks of host content: it is a card in the
// page's own layout, not a strip on its edge, so the preview shows it in flow
// rather than flush against the browser chrome like the banner.
export const EmbedPreview = (props: EmbedPreviewProps) => {
  const { contents, settings, customStyle } = props;
  const data = { ...DEFAULT_EMBED_DATA, allowUsersToDismiss: true };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="space-y-2">
        <div className="h-3 w-1/3 rounded bg-foreground/10" />
        <div className="h-3 w-2/3 rounded bg-foreground/10" />
      </div>
      <EmbedRoot themeSettings={settings} data={data} globalStyle={customStyle}>
        <InlineContainer>
          <EmbedWidget>
            <ContentEditorSerialize contents={contents} />
          </EmbedWidget>
        </InlineContainer>
      </EmbedRoot>
      <div className="space-y-2">
        <div className="h-3 w-1/2 rounded bg-foreground/10" />
        <div className="h-3 w-3/4 rounded bg-foreground/10" />
      </div>
    </div>
  );
};
