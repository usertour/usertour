import { useMutation } from '@apollo/client';
import { createContentVersion } from '@usertour-ui/gql/src/gql/content';
import { Content } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { useNavigate } from 'react-router-dom';

export const useContentBuilder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createVersion] = useMutation(createContentVersion);

  const openBuilder = async (content: Content, contentType: string) => {
    let versionId = content?.editedVersionId;

    if (content?.published && content.editedVersionId === content.publishedVersionId) {
      try {
        const { data } = await createVersion({
          variables: {
            data: {
              versionId: content.editedVersionId,
            },
          },
        });

        if (!data?.createContentVersion?.id) {
          toast({
            variant: 'destructive',
            title: 'Failed to create a new version.',
          });
          return false;
        }

        versionId = data.createContentVersion.id;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error creating new version',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
        });
        return false;
      }
    }

    navigate(`/env/${content?.environmentId}/${contentType}/${content?.id}/builder/${versionId}`);
    return true;
  };

  return { openBuilder };
};
