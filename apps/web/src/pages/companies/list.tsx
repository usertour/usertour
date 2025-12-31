import { useAppContext } from '@/contexts/app-context';
import { SegmentListProvider } from '@/contexts/segment-list-context';
import { CompanyListSidebar } from './components/layout';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { CompanyListContent } from './components/layout';

export const CompanyList = () => {
  const { environment } = useAppContext();

  return (
    <SegmentListProvider environmentId={environment?.id} bizType={['COMPANY']}>
      <CompanyListSidebar environmentId={environment?.id} />

      <ScrollArea className="h-full w-full ">
        <CompanyListContent environmentId={environment?.id} />
      </ScrollArea>
    </SegmentListProvider>
  );
};

CompanyList.displayName = 'CompanyList';
