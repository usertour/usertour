import { useAppContext } from '@/contexts/app-context';
import { isVersionPublished } from '@/utils/content';
import { Content } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useNavigate } from 'react-router-dom';
import { useCreateContentVersionMutation } from '@usertour-packages/hooks';

export const useContentBuilder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { invoke: createVersion } = useCreateContentVersionMutation();
  const { environment } = useAppContext();

  const openBuilder = async (content: Content, contentType: string, stepIndex?: number) => {
    let versionId = content?.editedVersionId;

    // Fork only when the version we'd be opening is already live in some
    // environment — otherwise the click reopens the existing draft. Reads
    // contentOnEnvironments (per-env source of truth) instead of the
    // legacy Content.publishedVersionId field, which the schema marks
    // @deprecated because it picks the wrong version under multi-env
    // setups (a publish in prod overwrites the field even when the user
    // is editing a staging-only draft).
    if (versionId && isVersionPublished(content, versionId)) {
      try {
        const newVersion = await createVersion({
          versionId,
        });

        if (!newVersion?.id) {
          toast({
            variant: 'destructive',
            title: 'Failed to create a new version.',
          });
          return false;
        }

        versionId = newVersion.id;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error creating new version',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
        });
        return false;
      }
    }

    const baseUrl = `/env/${environment?.id}/${contentType}/${content?.id}/builder/${versionId}`;
    const url = stepIndex !== undefined ? `${baseUrl}?step=${stepIndex}` : baseUrl;
    navigate(url);
    return true;
  };

  return { openBuilder };
};
