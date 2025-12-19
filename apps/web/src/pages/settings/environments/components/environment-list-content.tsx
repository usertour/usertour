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
import { cn } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { EnvironmentListAction } from './environment-list-action';

interface EnvironmentListContentTableRowProps {
  environment: Environment;
}
const EnvironmentListContentTableRow = (props: EnvironmentListContentTableRowProps) => {
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
      <TableCell onMouseEnter={() => setIsShowCopy(true)} onMouseLeave={() => setIsShowCopy(false)}>
        <div className="flex flex-row items-center space-x-1">
          <span>{environment.token} </span>
          <Button
            variant={'ghost'}
            size={'icon'}
            className={cn('w-6 h-6 rounded', isShowCopy ? 'visible' : 'invisible')}
            onClick={handleCopy}
          >
            <CopyIcon className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
      <TableCell>{format(new Date(environment.createdAt), 'PPpp')}</TableCell>
      <TableCell>
        <EnvironmentListAction environment={environment} />
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
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Environment name</TableHead>
              <TableHead>
                Usertour.js Token
                <QuestionTooltip className="inline ml-1">
                  You need this when installing Usertour.js in your web app. See
                  https://docs.usertour.io for more details.
                </QuestionTooltip>
              </TableHead>
              <TableHead>CreatedAt</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {environmentList ? (
              environmentList?.map((environment: Environment) => (
                <EnvironmentListContentTableRow environment={environment} key={environment.id} />
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

EnvironmentListContent.displayName = 'EnvironmentListContent';
