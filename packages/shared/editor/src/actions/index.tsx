import {
  ContentActionsProvider,
  ContentActionsProviderProps,
} from '../contexts/content-actions-context';
import { ContentActionsGroup } from './actions-group';

export const ContentActions = (props: ContentActionsProviderProps) => {
  return (
    <ContentActionsProvider {...props}>
      <ContentActionsGroup />
    </ContentActionsProvider>
  );
};

ContentActions.displayName = 'ContentActions';
