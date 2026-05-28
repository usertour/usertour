import { useAppContext } from '@/contexts/app-context';
import { ScrollArea } from '@usertour/ui';
import { useParams } from 'react-router-dom';
import type { EntityConfig } from './entity-config';

interface EntityDetailPageProps {
  config: EntityConfig<any>;
}

export const EntityDetailPage = ({ config }: EntityDetailPageProps) => {
  const params = useParams<Record<string, string>>();
  const id = params[config.routeParamKey];
  const { environment } = useAppContext();
  const { DetailContent } = config;

  return (
    <ScrollArea className="h-full w-full">
      <div className="min-h-full">
        {environment?.id && id && <DetailContent environmentId={environment.id} id={id} />}
      </div>
    </ScrollArea>
  );
};

EntityDetailPage.displayName = 'EntityDetailPage';
