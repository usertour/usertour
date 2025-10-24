import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionListContext } from '@/contexts/content-version-list-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { ContentVersion } from '@usertour/types';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { ContentVersionAction } from './content-version-action';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { ListSkeleton } from '@/components/molecules/skeleton';

export const ContentVersionTable = () => {
  const { content, loading: contentLoading } = useContentDetailContext();
  const { versionList, refetch, loading: versionListLoading } = useContentVersionListContext();
  const { loading: environmentLoading } = useEnvironmentListContext();

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Show skeleton if any of the required data is loading
  if (contentLoading || versionListLoading || environmentLoading) {
    return <ListSkeleton />;
  }

  const getPublishedEnvironmentsForVersion = (versionId: string) => {
    let environmentsFromContentOnEnvironments: string[] = [];
    // Get environments from contentOnEnvironments

    if (content?.contentOnEnvironments && content?.contentOnEnvironments.length > 0) {
      environmentsFromContentOnEnvironments = content?.contentOnEnvironments
        ?.filter((item) => item.published && item.publishedVersionId === versionId)
        .map((item) => item.environment.name);
    }

    return environmentsFromContentOnEnvironments;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>CreatedAt</TableHead>
          <TableHead>UpdatedAt</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {versionList ? (
          versionList.map((version: ContentVersion) => (
            <TableRow key={version.id} onClick={() => {}}>
              <TableCell>
                <div className="flex flex-row items-center">
                  <div>v{version.sequence}</div>
                  {getPublishedEnvironmentsForVersion(version.id)?.map((name) => (
                    <div
                      key={name}
                      className="ml-2 rounded-md bg-green-500 px-1.5 text-xs no-underline group-hover:no-underline leading-6 font-bold text-primary-foreground"
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>{format(new Date(version.createdAt), 'PPpp')}</TableCell>
              <TableCell>{format(new Date(version.updatedAt), 'PPpp')}</TableCell>
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

ContentVersionTable.displayName = 'ContentVersionTable';
