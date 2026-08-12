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

    // Server-resolved: a frozen version (live now, or EVER live) forks, an
    // editable draft is reused as-is — the server owns that rule (see
    // resolveEditableVersionId). The fork updates content.editedVersionId
    // server-side; the builder loads that via getContent, so the resolved id
    // isn't needed in the URL.
    try {
      await resolveEditableVersionId(editedVersionId, createVersion);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error creating new version',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      return false;
    }

    const baseUrl = `/env/${environment?.id}/${contentType}/${content?.id}/builder`;
    // Step is a path segment of the builder's descendant <Routes> (flow.tsx's
    // `step/:stepId`, keyed by the step's stable id), not a query param.
    const url = stepId !== undefined ? `${baseUrl}/step/${stepId}` : baseUrl;
    navigate(url);
    return true;
  };

  return { openBuilder };
};
