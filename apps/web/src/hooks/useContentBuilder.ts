import { useAppContext } from '@/contexts/app-context';
import { Content } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useNavigate } from 'react-router-dom';
import { useCreateContentVersionMutation } from '@usertour-packages/shared-hooks';

export const useContentBuilder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { invoke: createVersion } = useCreateContentVersionMutation();
  const { environment } = useAppContext();

  const openBuilder = async (content: Content, contentType: string, stepIndex?: number) => {
    let versionId = content?.editedVersionId;

    if (content?.published && content.editedVersionId === content.publishedVersionId) {
      if (!content.editedVersionId) {
        toast({
          variant: 'destructive',
          title: 'Failed to create a new version.',
        });
        return false;
      }

      try {
        const newVersion = await createVersion({
          versionId: content.editedVersionId,
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
