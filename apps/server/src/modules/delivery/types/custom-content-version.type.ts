import type { ContentConfigObject } from '@usertour/types';

import type { ContentSessionCollection } from './content-session-collection.type';
import type { VersionWithStepsAndContent } from './version-with-steps-and-content.type';

export type CustomContentVersion = Omit<VersionWithStepsAndContent, 'config'> & {
  session: ContentSessionCollection;
  config: ContentConfigObject;
};
