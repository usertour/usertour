import type { Content } from '@prisma/client';

import type { VersionDeliveredLocalization } from './version-delivered-localization.type';
import type { VersionWithSteps } from './version-with-steps.type';

export type VersionWithStepsAndContent = VersionWithSteps & {
  content: Content;
  versionOnLocalization?: VersionDeliveredLocalization[];
};
