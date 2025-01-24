import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usertour-ui/table";
import { ContentVersionAction } from "./content-version-action";
import { useContentDetailContext } from "@/contexts/content-detail-context";
import { ContentVersion } from "@usertour-ui/types";
import { format } from "date-fns";
import { useContentVersionListContext } from "@/contexts/content-version-list-context";
import { useEffect } from "react";

export const ContentVersionTable = () => {
  const { content } = useContentDetailContext();
  const { versionList, refetch } = useContentVersionListContext();

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>CreatedAt</TableHead>
          <TableHead>UpdatedAt</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versionList ? (
          versionList.map((version: ContentVersion) => (
            <TableRow key={version.id} onClick={() => {}}>
              <TableCell>
                <div className="flex flex-row items-center">
                  <div>v{version.sequence}</div>
                  {content &&
                    content.published &&
                    content.publishedVersionId == version.id && (
                      <div className="ml-2 rounded-md bg-green-500 px-1.5 text-xs no-underline group-hover:no-underline leading-6 font-bold text-primary-foreground">
                        Published
                      </div>
                    )}
                  {content &&
                    content.publishedVersionId != version.id &&
                    content.editedVersionId == version.id && (
                      <div className="ml-2 rounded-md bg-blue-500 px-1.5 text-xs no-underline group-hover:no-underline leading-6 font-bold text-primary-foreground">
                        Staging
                      </div>
                    )}
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(version.createdAt), "PPpp")}
              </TableCell>
              <TableCell>
                {format(new Date(version.updatedAt), "PPpp")}
              </TableCell>
              <TableCell>
                <ContentVersionAction version={version} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="h-24 text-center">No results.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

ContentVersionTable.displayName = "ContentVersionTable";
