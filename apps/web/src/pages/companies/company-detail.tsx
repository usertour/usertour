import { useAppContext } from '@/contexts/app-context';
import { useParams } from 'react-router-dom';
import { ScrollArea } from '@usertour/ui';
import { CompanyDetailContent } from './components/company-detail-content';

export const CompanyDetail = () => {
  const { companyId } = useParams();
  const { environment } = useAppContext();

  return (
    <ScrollArea className="h-full w-full">
      <div className="min-h-full">
        {environment?.id && companyId && (
          <CompanyDetailContent environmentId={environment?.id} companyId={companyId} />
        )}
      </div>
    </ScrollArea>
  );
};

CompanyDetail.displayName = 'CompanyDetail';
