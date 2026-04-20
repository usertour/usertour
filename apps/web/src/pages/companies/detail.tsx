import { useAppContext } from '@/contexts/app-context';
import { CompanyListProvider } from '@/contexts/company-list-context';
import { useParams } from 'react-router-dom';
import { CompanyDetailContent } from './components/layout';
import { ScrollArea } from '@usertour-packages/scroll-area';

export const CompanyDetail = () => {
  const { companyId } = useParams();
  const { environment } = useAppContext();
  return (
    <CompanyListProvider environmentId={environment?.id} defaultQuery={{ companyId }}>
      <ScrollArea className="h-full w-full">
        <div className="min-h-full bg-slate-50">
          {environment?.id && companyId && (
            <CompanyDetailContent environmentId={environment?.id} companyId={companyId} />
          )}
        </div>
      </ScrollArea>
    </CompanyListProvider>
  );
};

CompanyDetail.displayName = 'CompanyDetail';
