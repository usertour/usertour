import { Separator } from "@usertour-ui/separator";
import { ContentVersionTable } from "./content-version-table";

export const ContentDetailVersion = () => {
  return (
    <>
      <div className="flex p-14 mt-12 space-x-8 justify-center ">
        <div className="flex flex-col p-4 shadow bg-white rounded-lg space-y-6 w-full  max-w-screen-xl mx-auto">
          <h3 className="text-lg font-medium">Version history</h3>
          <Separator />
          <div className="">
            <ContentVersionTable />
          </div>
        </div>
      </div>
    </>
  );
};

ContentDetailVersion.displayName = "ContentDetailVersion";
