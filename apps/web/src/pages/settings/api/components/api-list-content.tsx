import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { format } from 'date-fns';
import { useApiContext } from '@/contexts/api-context';
import { Skeleton } from '@usertour-ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { AccessToken } from '@usertour-ui/shared-hooks';

export const ApiListContent = () => {
  const { accessTokens, loading, refetch } = useApiContext();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!accessTokens) {
    return (
      <div className="flex items-center justify-center h-32 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>Failed to load API tokens</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="ml-2 text-sm underline hover:text-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Token</TableHead>
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accessTokens.map((token: AccessToken) => (
          <TableRow key={token.id}>
            <TableCell>{token.name}</TableCell>
            <TableCell>
              <div className="flex items-center h-10">{token.accessToken}</div>
            </TableCell>
            <TableCell>{format(new Date(token.createdAt), 'PPpp')}</TableCell>
          </TableRow>
        ))}
        {accessTokens.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
              No API tokens found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
