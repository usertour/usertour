import { useAppContext } from '@/contexts/app-context';
import { CompanyListProvider } from '@/contexts/company-list-context';
import { useParams } from 'react-router-dom';
import { CompanyDetailContent } from './components/company-detail-content';
import { ScrollArea } from '@usertour/ui';

export const CompanyDetail = () => {
  const { companyId } = useParams();
  const { environment } = useAppContext();
  return (
    <CompanyListProvider environmentId={environment?.id} defaultQuery={{ companyId }}>
      <ScrollArea className="h-full w-full">
        <div className="min-h-full">
          {environment?.id && companyId && (
            <CompanyDetailContent environmentId={environment?.id} companyId={companyId} />
          )}
        </div>
      </ScrollArea>
    </CompanyListProvider>
  );
};

CompanyDetail.displayName = 'CompanyDetail';
