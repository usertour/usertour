import { ContentActionsItemType } from '@usertour/types';
import { registerActionSchema } from '../registry';
import { dismissSchema } from './dismiss-shared';

export const embedDismissSchema = dismissSchema({
  type: ContentActionsItemType.EMBED_DISMIS,
  labelKey: 'actions.types.embedDismiss.label',
  summaryKey: 'actions.types.embedDismiss.summary',
});

registerActionSchema(embedDismissSchema);
