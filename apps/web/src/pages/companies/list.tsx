import { CompanyListSidebar } from "@/pages/companies/components/sidebar";
import { SegmentListProvider } from "@/contexts/segment-list-context";
import { CompanyListContent } from "./components/content";
import { useAppContext } from "@/contexts/app-context";
import { ScrollArea } from "@usertour-ui/scroll-area";

export const CompanyList = () => {
  const { environment } = useAppContext();

  return (
    <SegmentListProvider environmentId={environment?.id} bizType={["COMPANY"]}>
      <CompanyListSidebar className="hidden lg:block flex-none w-72 pt-2 mr-4" />

      <ScrollArea className="h-full w-full ">
        <CompanyListContent environmentId={environment?.id} />
      </ScrollArea>
    </SegmentListProvider>
  );
};

CompanyList.displayName = "CompanyList";
