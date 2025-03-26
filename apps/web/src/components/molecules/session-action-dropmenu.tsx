import { useAppContext } from '@/contexts/app-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { Delete2Icon } from '@usertour-ui/icons';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { BizSession } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { ZoomIn } from 'lucide-react';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

type SessionActionDropdownMenuProps = {
  session: BizSession;
  children: ReactNode;
  onSubmit?: (action: string) => void;
  disabled?: boolean;
};

export const SessionActionDropdownMenu = (props: SessionActionDropdownMenuProps) => {
  const { session, children, onSubmit, disabled = false } = props;
  const { toast } = useToast();
  const { isViewOnly, environment } = useAppContext();
  const navigate = useNavigate();

  const handleOnClick = () => {
    try {
      onSubmit?.('setAsDefault');
      toast({
        variant: 'success',
        title: 'The theme has been successfully set as default',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
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
          <DropdownMenuItem
            className="cursor-pointer text-destructive"
            disabled={isViewOnly}
            onClick={handleOnClick}
          >
            <Delete2Icon className="w-4 h-4 mr-0.5" />
            Delete session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

SessionActionDropdownMenu.displayName = 'SessionActionDropdownMenu';
