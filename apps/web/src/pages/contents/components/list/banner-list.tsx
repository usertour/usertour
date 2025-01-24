import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@usertour-ui/button";
import { Separator } from "@usertour-ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@usertour-ui/tabs";
import { EmptyPlaceholder } from "../shared/empty-placeholder";
import { DataTable } from "./data-table";
import { useState } from "react";
import { useContentListContext } from "@/contexts/content-list-context";
import { ExtensionInstallDialog } from "../shared/extension-install-dialog";
import { isInstalledExtension } from "@usertour-ui/builder";
import { ContentListSkeleton } from "@/components/molecules/skeleton";
import { BannerCreateForm } from "../shared/banner-create-form";

export const BannerListContent = () => {
  const [open, setOpen] = useState(false);
  const [isOpenedInstall, setIsOpenedInstall] = useState(false);

  const openCreateFormHandler = async () => {
    const isInstalled = await isInstalledExtension();
    if (!isInstalled) {
      setIsOpenedInstall(true);
    } else {
      setOpen(true);
    }
  };

  const { contents, refetch, setQuery, contentType, isLoading } =
    useContentListContext();
  const handleOnClose = async () => {
    setOpen(false);
    refetch();
  };

  const handleOnValueChange = async (value: string) => {
    if (value == "published") {
      setQuery({ published: true });
    } else {
      setQuery({});
    }
  };

  const handleOnInstalled = () => {
    setIsOpenedInstall(false);
    setOpen(true);
  };

  return (
    <div className="h-full px-4 py-6 lg:px-8 lg:border-l shadow bg-white rounded-lg grow">
      <div className="flex items-center justify-between">
        <>
          <div className="flex flex-col space-y-1 ">
            <h3 className="text-2xl font-semibold tracking-tight">Banners</h3>
            <div className="flex flex-row space-x-1">
              <p className="text-sm text-muted-foreground">
                Launchers are great for: Hotspots drawing attention to important
                features, Tooltips with help text, Buttons that trigger actions,
                such as starting a flow.{" "}
              </p>
            </div>
          </div>
        </>
      </div>
      <Separator className="my-4" />
      <Tabs
        defaultValue="all"
        className="h-full space-y-6"
        onValueChange={handleOnValueChange}
      >
        <div className="space-between flex items-center">
          <TabsList>
            <TabsTrigger value="all" className="relative">
              All
            </TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
          </TabsList>
          <div className="ml-auto">
            <Button onClick={openCreateFormHandler}>
              <PlusCircledIcon className="mr-2 h-4 w-4" />
              Create Banner
            </Button>
          </div>
        </div>
        {isLoading && <ContentListSkeleton count={9} />}
        {!isLoading && contents && contents.length == 0 && (
          <EmptyPlaceholder
            name="No banners added"
            description="You have not added any banners. Add one below."
          >
            <Button onClick={openCreateFormHandler}>
              <PlusCircledIcon className="mr-2 h-4 w-4" />
              Create Banner
            </Button>
          </EmptyPlaceholder>
        )}
        {!isLoading && contents && contents.length > 0 && (
          <>
            <TabsContent value="all" className="border-none p-0 outline-none">
              <DataTable />
            </TabsContent>
            <TabsContent
              value="published"
              className="h-full flex-col border-none p-0 data-[state=active]:flex"
            >
              <DataTable />
            </TabsContent>
          </>
        )}
      </Tabs>
      <BannerCreateForm isOpen={open} onClose={handleOnClose} />
      <ExtensionInstallDialog
        isOpen={isOpenedInstall}
        onInstalled={handleOnInstalled}
        onOpenChange={setIsOpenedInstall}
      />
    </div>
  );
};

BannerListContent.displayName = "BannerListContent";
