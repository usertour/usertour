import { ListSkeleton } from '@/components/molecules/skeleton';
import { CopyIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { cn } from '@usertour-ui/ui-utils';
import { useToast } from '@usertour-ui/use-toast';
import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { MemberListAction } from './member-list-action';

interface MemberListContentTableRowProps {
  data: any;
}
const MemberListContentTableRow = (props: MemberListContentTableRowProps) => {
  const { data } = props;
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isShowCopy, setIsShowCopy] = useState<boolean>(false);
  const { toast } = useToast();

  const handleCopy = useCallback(() => {
    copyToClipboard(data.token);
    toast({
      title: `"${data.token}" copied to clipboard`,
    });
  }, [data.token]);

  return (
    <TableRow className="cursor-pointer">
      <TableCell>{data.name}</TableCell>
      <TableCell onMouseEnter={() => setIsShowCopy(true)} onMouseLeave={() => setIsShowCopy(false)}>
        <div className="flex flex-row items-center space-x-1">
          <span>{data.token} </span>
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
      <TableCell>{format(new Date(data.createdAt), 'PPpp')}</TableCell>
      <TableCell>
        <MemberListAction data={data} />
      </TableCell>
    </TableRow>
  );
};

export const MemberListContent = () => {
  const memberList = [{ name: 'dsds', createdAt: '2024-01-01 10:00:00', token: 'ccc' }];
  const loading = false;
  if (loading) {
    return <ListSkeleton />;
  }
  return (
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>
                Usertour.js Token
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <QuestionMarkCircledIcon className="inline ml-1 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-foreground text-background">
                      You need this when installing Usertour.js in your web app. See
                      https://docs.usertour.io for more details.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead>CreatedAt</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberList ? (
              memberList?.map((member: any) => (
                <MemberListContentTableRow data={member} key={member.id} />
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

MemberListContent.displayName = 'MemberListContent';
