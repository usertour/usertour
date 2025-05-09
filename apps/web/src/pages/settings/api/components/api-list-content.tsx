import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { useApiContext } from '@/contexts/api-context';
import { Skeleton } from '@usertour-ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { AccessToken } from '@usertour-ui/shared-hooks';
import { ApiListAction } from './api-list-action';
import { useAppContext } from '@/contexts/app-context';

export const ApiListContent = () => {
  const { accessTokens, loading, refetch } = useApiContext();
  const { environment } = useAppContext();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!accessTokens || !environment) {
    return (
      <div className="flex items-center justify-center h-32 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>Failed to load API keys</span>
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
          <TableHead className="w-1/2">Name</TableHead>
          <TableHead className="w-1/2">Key</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {accessTokens.map((token: AccessToken) => (
          <TableRow key={token.id}>
            <TableCell>{token.name}</TableCell>
            <TableCell>{token.accessToken}</TableCell>
            <TableCell>
              <ApiListAction token={token} environmentId={environment.id} />
            </TableCell>
          </TableRow>
        ))}
        {accessTokens.length === 0 && (
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
