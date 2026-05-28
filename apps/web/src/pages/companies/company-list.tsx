import { useAppContext } from '@/contexts/app-context';
import { SegmentListProvider } from '@/contexts/segment-list-context';
import { CompanyListSidebar } from './components/company-list-sidebar';
import { ScrollArea } from '@usertour/ui';
import { CompanyListContent } from './components/company-list-content';

export const CompanyList = () => {
  const { environment } = useAppContext();

  if (!environment?.id) {
    return null;
  }

  return (
    <SegmentListProvider environmentId={environment.id} bizType={['COMPANY']}>
      <CompanyListSidebar environmentId={environment.id} />

      <ScrollArea className="h-full w-full ">
        <CompanyListContent environmentId={environment.id} />
      </ScrollArea>
    </SegmentListProvider>
  );
};

CompanyList.displayName = 'CompanyList';
