import { ListSkeleton } from '@/components/molecules/skeleton';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { Environment } from '@usertour/types';
import { CopyIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { Badge } from '@usertour-packages/badge';
import { format } from 'date-fns';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import { EnvironmentListAction } from './environment-list-action';

interface EnvironmentListContentTableRowProps {
  environment: Environment;
  environmentCount: number;
}
const EnvironmentListContentTableRow = (props: EnvironmentListContentTableRowProps) => {
  const { environment, environmentCount } = props;
  const copyWithToast = useCopyWithToast();

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell>
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{environment.name}</span>
          {environment.isPrimary === true && <Badge variant={'success'}>Primary</Badge>}
        </div>
      </TableCell>
      <TableCell className="group">
        <div className="flex flex-row items-center space-x-1">
          <span>{environment.token} </span>
          <Button
            variant={'ghost'}
            size={'icon'}
            className="w-6 h-6 rounded invisible group-hover:visible"
            onClick={() => copyWithToast(environment.token)}
          >
            <CopyIcon className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
      <TableCell>{format(new Date(environment.createdAt), 'PPpp')}</TableCell>
      <TableCell>
        <EnvironmentListAction environment={environment} environmentCount={environmentCount} />
      </TableCell>
    </TableRow>
  );
};

export const EnvironmentListContent = () => {
  const { environmentList, loading, isRefetching } = useEnvironmentListContext();

  if (loading || isRefetching) {
    return <ListSkeleton />;
  }
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>Environment name</TableHead>
          <TableHead>
            Usertour.js Token
            <QuestionTooltip className="inline ml-1 mb-1">
              You need this when installing Usertour.js in your web app. See
              https://docs.usertour.io for more details.
            </QuestionTooltip>
          </TableHead>
          <TableHead className="w-60">CreatedAt</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {environmentList ? (
          environmentList?.map((environment: Environment) => (
            <EnvironmentListContentTableRow
              environment={environment}
              environmentCount={environmentList.length}
              key={environment.id}
            />
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

EnvironmentListContent.displayName = 'EnvironmentListContent';
