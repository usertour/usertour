import { useAppContext } from '@/contexts/app-context';
import { SegmentListProvider } from '@/contexts/segment-list-context';
import { CompanyListSidebar } from '@/pages/companies/components/sidebar';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { CompanyListContent } from './components/content';

export const CompanyList = () => {
  const { environment } = useAppContext();

  return (
    <SegmentListProvider environmentId={environment?.id} bizType={['COMPANY']}>
      <CompanyListSidebar />

      <ScrollArea className="h-full w-full ">
        <CompanyListContent environmentId={environment?.id} />
      </ScrollArea>
    </SegmentListProvider>
  );
};

CompanyList.displayName = 'CompanyList';
