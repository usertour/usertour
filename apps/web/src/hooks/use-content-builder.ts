import { useAppContext } from '@/contexts/app-context';
import { resolveEditableVersionId } from '@/utils/content';
import { Content } from '@usertour/types';
import { useToast } from '@usertour/ui';
import { useNavigate } from 'react-router-dom';
import { useCreateContentVersionMutation } from '@usertour/hooks';

export const useContentBuilder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { invoke: createVersion } = useCreateContentVersionMutation();
  const { environment } = useAppContext();

  const openBuilder = async (content: Content, contentType: string, stepId?: string) => {
    const editedVersionId = content?.editedVersionId;
    if (!editedVersionId) {
      return false;
    }

    // Fork only when the version we'd be opening is already live in some
    // environment — otherwise the click reopens the existing draft.
    // resolveEditableVersionId reads contentOnEnvironments (per-env source of
    // truth), not the @deprecated Content.publishedVersionId, which picks the
    // wrong version under multi-env setups (a publish in prod overwrites the
    // field even when the user is editing a staging-only draft).
    let versionId: string;
    try {
      versionId = await resolveEditableVersionId(content, editedVersionId, createVersion);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error creating new version',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      return false;
    }

    const baseUrl = `/env/${environment?.id}/${contentType}/${content?.id}/builder/${versionId}`;
    // Step is a path segment of the builder's descendant <Routes> (flow.tsx's
    // `step/:stepId`, keyed by the step's stable id), not a query param.
    const url = stepId !== undefined ? `${baseUrl}/step/${stepId}` : baseUrl;
    navigate(url);
    return true;
  };

  return { openBuilder };
};
