import { ContentActionsGroup } from "./actions-group";
import {
  ContentActionsProvider,
  ContentActionsProviderProps,
} from "../contexts/content-actions-context";

export const ContentActions = (props: ContentActionsProviderProps) => {
  return (
    <ContentActionsProvider {...props}>
      <ContentActionsGroup />
    </ContentActionsProvider>
  );
};

ContentActions.displayName = "ContentActions";
