import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { useApiContext } from '@/contexts/api-context';
import { AccessToken } from '@usertour-packages/shared-hooks';
import { ApiListAction } from './api-list-action';
import { useAppContext } from '@/contexts/app-context';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { format } from 'date-fns';

export const ApiListContent = () => {
  const { accessTokens, loading, isRefetching } = useApiContext();
  const { environment } = useAppContext();

  if (loading || !environment || isRefetching) {
    return <ListSkeleton />;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="table-fixed min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead className="w-48 hidden lg:table-cell">CreatedAt</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {accessTokens?.map((token: AccessToken) => (
            <TableRow key={token.id}>
              <TableCell className="truncate">{token.name}</TableCell>
              <TableCell className="truncate">{token.accessToken}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {format(new Date(token.createdAt), 'PPpp')}
              </TableCell>
              <TableCell>
                <ApiListAction token={token} environmentId={environment.id} />
              </TableCell>
            </TableRow>
          ))}
          {accessTokens?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No API keys found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
