import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { BizSession } from '@usertour-ui/types';
import { useAppContext } from '@/contexts/app-context';
import { useNavigate } from 'react-router-dom';
import { ZoomIn } from 'lucide-react';
import { Delete2Icon } from '@usertour-ui/icons';
type AnalyticsActionProps = {
  session: BizSession;
};
export const AnalyticsAction = (props: AnalyticsActionProps) => {
  const { session } = props;
  const { isViewOnly, environment } = useAppContext();
  const navigate = useNavigate();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              navigate(`/env/${environment?.id}/session/${session.id}`);
            }}
            className="cursor-pointer"
          >
            <ZoomIn className="w-4 h-4 mr-0.5" />
            View details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-destructive" disabled={isViewOnly}>
            <Delete2Icon className="w-4 h-4 mr-0.5" />
            Delete session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

AnalyticsAction.displayName = ' AnalyticsAction';
