import { ContentActionsItemType } from '@usertour/types';
import { registerActionSchema } from '../registry';
import { dismissSchema } from './dismiss-shared';

export const checklistDismissSchema = dismissSchema({
  type: ContentActionsItemType.CHECKLIST_DISMIS,
  labelKey: 'actions.types.checklistDismiss.label',
  summaryKey: 'actions.types.checklistDismiss.summary',
});

registerActionSchema(checklistDismissSchema);
