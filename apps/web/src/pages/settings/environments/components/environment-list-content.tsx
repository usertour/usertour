import { useEnvironmentListContext } from "@/contexts/environment-list-context";
import { Environment } from "@/types/project";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usertour-ui/table";
import { EnvironmentListAction } from "./environment-list-action";
import { format } from "date-fns";
import { ListSkeleton } from "@/components/molecules/skeleton";
import { CopyIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { useCopyToClipboard } from "react-use";
import { useCallback, useState } from "react";
import { cn } from "@usertour-ui/ui-utils";
import { useToast } from "@usertour-ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";
import { Button } from "@usertour-ui/button";

interface EnvironmentListContentTableRowProps {
  environment: Environment;
}
const EnvironmentListContentTableRow = (
  props: EnvironmentListContentTableRowProps
) => {
  const { environment } = props;
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isShowCopy, setIsShowCopy] = useState<boolean>(false);
  const { toast } = useToast();

  const handleCopy = useCallback(() => {
    copyToClipboard(environment.token);
    toast({
      title: `"${environment.token}" copied to clipboard`,
    });
  }, [environment.token]);

  return (
    <TableRow className="cursor-pointer">
      <TableCell>{environment.name}</TableCell>
      <TableCell
        onMouseEnter={() => setIsShowCopy(true)}
        onMouseLeave={() => setIsShowCopy(false)}
      >
        <div className="flex flex-row items-center space-x-1">
          <span>{environment.token} </span>
          <Button
            variant={"ghost"}
            size={"icon"}
            className={cn(
              "w-6 h-6 rounded",
              isShowCopy ? "visible" : "invisible"
            )}
            onClick={handleCopy}
          >
            <CopyIcon className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
      <TableCell>{format(new Date(environment.createdAt), "PPpp")}</TableCell>
      <TableCell>
        <EnvironmentListAction environment={environment} />
      </TableCell>
    </TableRow>
  );
};

export const EnvironmentListContent = () => {
  const { environmentList, loading } = useEnvironmentListContext();
  if (loading) {
    return <ListSkeleton />;
  }
  return (
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Environment name</TableHead>
              <TableHead>
                Usertour.js Token
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <QuestionMarkCircledIcon className="inline ml-1 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-foreground text-background">
                      You need this when installing Usertour.js in your web app.
                      See https://www.usertour.io/docs for more details.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead>CreatedAt</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {environmentList ? (
              environmentList?.map((environment: Environment) => (
                <EnvironmentListContentTableRow
                  environment={environment}
                  key={environment.id}
                />
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

EnvironmentListContent.displayName = "EnvironmentListContent";
