import { useQuery } from '@apollo/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { ListAccessTokens } from '@usertour-ui/gql';
import { format } from 'date-fns';
import { ApiListAction } from './api-list-action';
import { useAppContext } from '@/contexts/app-context';
interface AccessToken {
  id: string;
  name: string;
  accessToken: string;
  createdAt: string;
}

export const ApiListContent = () => {
  const { project } = useAppContext();
  const { data, loading } = useQuery(ListAccessTokens, {
    variables: { projectId: project?.id },
    skip: !project?.id,
  });

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
        {data?.listAccessTokens.map((token: AccessToken) => (
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
