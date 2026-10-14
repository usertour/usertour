import { ContentActionsItemType } from '@usertour/types';
import { registerActionSchema } from '../registry';
import { dismissSchema } from './dismiss-shared';

export const launcherDismissSchema = dismissSchema({
  type: ContentActionsItemType.LAUNCHER_DISMIS,
  labelKey: 'actions.types.launcherDismiss.label',
  summaryKey: 'actions.types.launcherDismiss.summary',
});

registerActionSchema(launcherDismissSchema);
