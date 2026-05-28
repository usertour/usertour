import { useCallback } from 'react';
import { Capability, type Project } from '@usertour/types';
import { useActiveProject } from './use-active-project';

// Project-scoped capability check. `isViewOnly` mirrors the historical
// `role === VIEWER` gate via the modern capability matrix — a VIEWER
// lacks every write capability, so "can't update content" is the
// canonical equivalent.
export const useCapabilities = () => {
  const project = useActiveProject() as (Project & { capabilities?: Capability[] }) | null;
  const capabilities: Capability[] = project?.capabilities ?? [];
  const can = useCallback(
    (capability: Capability) => capabilities.includes(capability),
    [capabilities],
  );
  const isViewOnly = !!project && !can(Capability.ContentUpdate);
  return { capabilities, can, isViewOnly };
};
