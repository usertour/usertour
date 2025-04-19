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
import {
  CloseCircleIcon,
  Delete2Icon,
  EmptyPlaceholderIcon,
  QuestionMarkCircledIcon,
  ZoomInIcon,
} from '@usertour-ui/icons';
import { useDeleteSessionMutation, useEndSessionMutation } from '@usertour-ui/shared-hooks';
import { BizEvent, BizEvents, BizSession } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { Fragment, ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@usertour-ui/dialog';
import { SessionResponse } from '@/components/molecules/session-detail';

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

// Type definitions for all components
type SessionFormProps = {
  session: BizSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
  type: 'delete' | 'end';
};

type ResponseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answerEvents: BizEvent[];
};

type SessionActionDropdownMenuProps = {
  session: BizSession;
  children: ReactNode;
  disabled?: boolean;
  showViewDetails?: boolean;
  showEndSession?: boolean;
  showDeleteSession?: boolean;
  showViewResponse?: boolean;
  onDeleteSuccess?: () => void;
  onEndSuccess?: () => void;
};

// Custom hook to handle session events
// Returns filtered and sorted answer events from session bizEvents
const useSessionEvents = (session?: BizSession) => {
  const bizEvents = session?.bizEvent?.sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const answerEvents = bizEvents?.filter(
    (bizEvent) => bizEvent.event?.codeName === BizEvents.QUESTION_ANSWERED,
  );

  return { answerEvents };
};

// Dialog component for displaying session responses
const ResponseDialog = ({ open, onOpenChange, answerEvents }: ResponseDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Question Response</DialogTitle>
      </DialogHeader>
      {answerEvents?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <EmptyPlaceholderIcon className="h-10 w-10 text-muted-foreground" />
          <p>No responses yet</p>
        </div>
      ) : (
        <SessionResponse answerEvents={answerEvents} />
      )}
    </DialogContent>
  </Dialog>
);

// Component containing all dropdown menu items
// Extracts menu items logic from main component to reduce complexity
const DropdownMenuItems = ({
  onResponseClick,
  onViewDetailsClick,
  onEndClick,
  onDeleteClick,
  showViewDetails,
  showEndSession,
  showDeleteSession,
  showViewResponse,
  isViewOnly,
  sessionState,
}: {
  onResponseClick: () => void;
  onViewDetailsClick: () => void;
  onEndClick: () => void;
  onDeleteClick: () => void;
  showViewDetails: boolean;
  showEndSession: boolean;
  showDeleteSession: boolean;
  showViewResponse: boolean;
  isViewOnly: boolean;
  sessionState: number;
}) => (
  <>
    {showViewDetails && (
      <DropdownMenuItem onClick={onViewDetailsClick} className="cursor-pointer">
        <ZoomInIcon className="w-4 h-4 mr-1" />
        View details
      </DropdownMenuItem>
    )}
    <DropdownMenuSeparator />
    {showViewResponse && (
      <DropdownMenuItem onClick={onResponseClick} className="cursor-pointer">
        <QuestionMarkCircledIcon className="w-4 h-4 mr-1" />
        View Response
      </DropdownMenuItem>
    )}
    {showViewDetails && showEndSession && <DropdownMenuSeparator />}
    {showEndSession && (
      <DropdownMenuItem
        className="cursor-pointer"
        disabled={isViewOnly || sessionState === 1}
        onClick={onEndClick}
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
        onClick={onDeleteClick}
      >
        <Delete2Icon className="w-4 h-4 mr-1" />
        Delete session
      </DropdownMenuItem>
    )}
  </>
);

// Form component for session actions (delete/end)
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

/**
 * Main dropdown menu component for session actions
 * Provides options to:
 * - View session responses
 * - View session details
 * - End session
 * - Delete session
 */
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
    showViewResponse = true,
  } = props;

  const { isViewOnly, environment } = useAppContext();
  const navigate = useNavigate();
  const { answerEvents } = useSessionEvents(session);

  // State for controlling different dialogs
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);

  // Handler for navigating to session details
  const handleViewDetails = () => navigate(`/env/${environment?.id}/session/${session.id}`);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
          <DropdownMenuItems
            onResponseClick={() => setResponseOpen(true)}
            onViewDetailsClick={handleViewDetails}
            onEndClick={() => setEndOpen(true)}
            onDeleteClick={() => setDeleteOpen(true)}
            showViewDetails={showViewDetails}
            showEndSession={showEndSession}
            showDeleteSession={showDeleteSession}
            showViewResponse={showViewResponse}
            isViewOnly={isViewOnly}
            sessionState={session.state}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Session deletion confirmation dialog */}
      <SessionForm
        type="delete"
        session={session}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSubmit={(success) => {
          setDeleteOpen(false);
          success && onDeleteSuccess?.();
        }}
      />

      {/* Session end confirmation dialog */}
      <SessionForm
        type="end"
        session={session}
        open={endOpen}
        onOpenChange={setEndOpen}
        onSubmit={(success) => {
          setEndOpen(false);
          success && onEndSuccess?.();
        }}
      />

      {/* Session response dialog */}
      <ResponseDialog
        open={responseOpen}
        onOpenChange={setResponseOpen}
        answerEvents={answerEvents ?? []}
      />
    </>
  );
};

// Display name for debugging purposes
SessionActionDropdownMenu.displayName = 'SessionActionDropdownMenu';
