import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { format } from 'date-fns';
import { ApiListAction } from './api-list-action';
import { useApiContext } from '@/contexts/api-context';

export const ApiListContent = () => {
  const { accessTokens, loading } = useApiContext();

  if (loading) {
    return <div>Loading...</div>;
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
        {accessTokens?.map((token) => (
          <TableRow key={token.id}>
            <TableCell>{token.name}</TableCell>
            <TableCell>
              <div className="flex items-center">
                <span className="mr-2">{token.accessToken}</span>
                <ApiListAction token={token.accessToken} />
              </div>
            </TableCell>
            <TableCell>{format(new Date(token.createdAt), 'PPpp')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
