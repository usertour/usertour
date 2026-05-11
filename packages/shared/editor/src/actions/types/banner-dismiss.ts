import { ContentActionsItemType } from '@usertour/types';
import { registerActionSchema } from '../registry';
import { dismissSchema } from './dismiss-shared';

export const bannerDismissSchema = dismissSchema({
  type: ContentActionsItemType.BANNER_DISMIS,
  labelKey: 'actions.types.bannerDismiss.label',
  summaryKey: 'actions.types.bannerDismiss.summary',
});

registerActionSchema(bannerDismissSchema);
