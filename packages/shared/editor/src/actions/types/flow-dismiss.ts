import { ContentActionsItemType } from '@usertour/types';
import { registerActionSchema } from '../registry';
import { dismissSchema } from './dismiss-shared';

export const flowDismissSchema = dismissSchema({
  type: ContentActionsItemType.FLOW_DISMIS,
  labelKey: 'actions.types.flowDismiss.label',
  summaryKey: 'actions.types.flowDismiss.summary',
});

registerActionSchema(flowDismissSchema);
