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

/** A stand-in host card: the page's own content, so the embed reads as a card among cards. */
const HostCard = () => (
  <div className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm">
    <div className="h-3 w-1/3 rounded bg-foreground/10" />
    <div className="h-3 w-2/3 rounded bg-foreground/[0.07]" />
    <div className="mt-1 h-16 rounded bg-foreground/[0.05]" />
  </div>
);

// The embed is a card in the page's own layout, not a strip on its edge: the
// preview puts it in a stand-in dashboard — a page title, the embed, then the
// page's own cards — on the page's grey backdrop, so a card that takes the
// theme's main color still reads as a card.
export const EmbedPreview = (props: EmbedPreviewProps) => {
  const { contents, settings, customStyle } = props;
  const data = { ...DEFAULT_EMBED_DATA, allowUsersToDismiss: true };

  return (
    <div className="flex h-full flex-col gap-5 bg-muted/40 p-6">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-foreground/15" />
        <div className="h-3 w-72 rounded bg-foreground/[0.07]" />
      </div>
      <EmbedRoot themeSettings={settings} data={data} globalStyle={customStyle}>
        <InlineContainer>
          <EmbedWidget>
            <ContentEditorSerialize contents={contents} />
          </EmbedWidget>
        </InlineContainer>
      </EmbedRoot>
      <div className="grid grid-cols-2 gap-4">
        <HostCard />
        <HostCard />
      </div>
    </div>
  );
};
