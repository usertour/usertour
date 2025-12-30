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
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead className="w-60">CreatedAt</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {accessTokens?.map((token: AccessToken) => (
          <TableRow key={token.id}>
            <TableCell className="truncate">{token.name}</TableCell>
            <TableCell className="truncate">{token.accessToken}</TableCell>
            <TableCell>{format(new Date(token.createdAt), 'PPpp')}</TableCell>
            <TableCell>
              <ApiListAction token={token} environmentId={environment.id} />
            </TableCell>
          </TableRow>
        ))}
        {accessTokens?.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
              No API keys found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
