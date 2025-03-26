import { useAppContext } from '@/contexts/app-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogFooter,
} from '@usertour-ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { CloseCircleIcon, Delete2Icon } from '@usertour-ui/icons';
import { useDeleteSessionMutation, useEndSessionMutation } from '@usertour-ui/shared-hooks';
import { BizSession } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { ZoomIn } from 'lucide-react';
import { Fragment, ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Create a custom hook for form handling
const useSessionForm = (
  session: BizSession,
  action: 'delete' | 'end',
  onSubmit: (success: boolean) => void,
) => {
  const { toast } = useToast();
  const { invoke: deleteSession } = useDeleteSessionMutation();
  const { invoke: endSession } = useEndSessionMutation();

  const handleSubmit = async () => {
    try {
      const invoke = action === 'delete' ? deleteSession : endSession;
      const result = await invoke(session.id);

      if (result) {
        toast({
          variant: 'success',
          title: `The session has been successfully ${action}ed`,
        });
        onSubmit(true);
        return;
      }
    } catch (_) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: `Failed to ${action} session`,
      });
    }
  };

  return { handleSubmit };
};

// Simplified form component
type SessionFormProps = {
  session: BizSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
  type: 'delete' | 'end';
};

const SessionForm = ({ session, open, onOpenChange, onSubmit, type }: SessionFormProps) => {
  const { handleSubmit } = useSessionForm(session, type, onSubmit);

  const descriptions = {
    delete:
      'This will delete all traces of this session from your account. Including in analytics.\nYou should probably only do this for testing reasons.',
    end: 'This will close the flow for the user.',
  };

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogDescription>
            {descriptions[type].split('\n').map((line, i) => (
              <Fragment key={i}>
                {line}
                <br />
              </Fragment>
            ))}
            Confirm {type}ing the session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={type === 'delete' ? 'destructive' : undefined}
            onClick={handleSubmit}
          >
            Yes, {type} session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

type SessionActionDropdownMenuProps = {
  session: BizSession;
  children: ReactNode;
  disabled?: boolean;
  showViewDetails?: boolean;
  showEndSession?: boolean;
  showDeleteSession?: boolean;
  onDeleteSuccess?: () => void;
  onEndSuccess?: () => void;
};

export const SessionActionDropdownMenu = (props: SessionActionDropdownMenuProps) => {
  const {
    session,
    children,
    onDeleteSuccess,
    onEndSuccess,
    disabled = false,
    showViewDetails = true,
    showEndSession = true,
    showDeleteSession = true,
  } = props;
  const { isViewOnly, environment } = useAppContext();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
          {showViewDetails && (
            <DropdownMenuItem
              onClick={() => {
                navigate(`/env/${environment?.id}/session/${session.id}`);
              }}
              className="cursor-pointer"
            >
              <ZoomIn className="w-4 h-4 mr-1" />
              View details
            </DropdownMenuItem>
          )}
          {showViewDetails && showEndSession && <DropdownMenuSeparator />}
          {showEndSession && (
            <DropdownMenuItem
              className="cursor-pointer "
              disabled={isViewOnly || session.state === 1}
              onClick={() => {
                setEndOpen(true);
              }}
            >
              <CloseCircleIcon className="w-4 h-4 mr-1" />
              End session now
            </DropdownMenuItem>
          )}
          {showEndSession && showDeleteSession && <DropdownMenuSeparator />}
          {showDeleteSession && (
            <DropdownMenuItem
              className="cursor-pointer text-destructive"
              disabled={isViewOnly}
              onClick={() => {
                setDeleteOpen(true);
              }}
            >
              <Delete2Icon className="w-4 h-4 mr-1" />
              Delete session
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <SessionForm
        type="delete"
        session={session}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSubmit={(success) => {
          setDeleteOpen(false);
          if (success) {
            onDeleteSuccess?.();
          }
        }}
      />
      <SessionForm
        type="end"
        session={session}
        open={endOpen}
        onOpenChange={setEndOpen}
        onSubmit={(success) => {
          setEndOpen(false);
          if (success) {
            onEndSuccess?.();
          }
        }}
      />
    </>
  );
};

SessionActionDropdownMenu.displayName = 'SessionActionDropdownMenu';
