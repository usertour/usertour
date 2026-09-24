import { useListDefinitionReferencesQuery } from '@usertour/hooks';
import type { DefinitionReferenceKind } from '@usertour/types';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { DefinitionInUseDialog } from './definition-in-use-dialog';

export interface DefinitionDeleteGateProps {
  kind: DefinitionReferenceKind;
  id: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The delete confirmation, shown when nothing uses the definition. */
  children: ReactNode;
}

/**
 * Checks what uses a definition as its delete dialog opens (ADR 0016): if
 * anything does, it shows where instead of offering a delete the server would
 * refuse. The server check stays the authority — should the lookup fail, the
 * confirmation shows as before and a refusal still arrives as an error.
 */
export const DefinitionDeleteGate = (props: DefinitionDeleteGateProps) => {
  const { kind, id, name, open, onOpenChange, children } = props;
  const { t } = useTranslation();
  const { project } = useAppContext();
  const { references, loading } = useListDefinitionReferencesQuery(
    project?.id,
    kind,
    open ? id : undefined,
  );

  // Open nothing until the answer is in, so a blocked delete never flashes
  // its confirmation first.
  if (open && loading) {
    return null;
  }
  if (open && references && references.length > 0) {
    return (
      <DefinitionInUseDialog
        resource={t(`definitionReferences.kinds.${kind}`)}
        name={name}
        references={references}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }
  return <>{children}</>;
};

DefinitionDeleteGate.displayName = 'DefinitionDeleteGate';
