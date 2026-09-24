import type { Step, Version } from '@prisma/client';

export type VersionWithSteps = Version & { steps: Step[] };
