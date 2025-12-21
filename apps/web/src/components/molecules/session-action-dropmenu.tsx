import { useAppContext } from '@/contexts/app-context';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogFooter,
} from '@usertour-packages/alert-dialog';
import { LoadingButton } from '@/components/molecules/loading-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import {
  CloseCircleIcon,
  Delete2Icon,
  EmptyPlaceholderIcon,
  QuestionMarkCircledIcon,
  ZoomInIcon,
} from '@usertour-packages/icons';
import { useDeleteSessionMutation, useEndSessionMutation } from '@usertour-packages/shared-hooks';
import { BizSession } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { Fragment, ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@usertour-packages/dialog';
import { SessionResponse } from '@/components/molecules/session-detail';
import { getOrderedQuestionAnswers, QuestionWithAnswer } from '@/utils/session';

// Create a custom hook for form handling
const useSessionForm = (
  session: BizSession,
  action: 'delete' | 'end',
  onSubmit: (success: boolean) => void,
) => {
  const { toast } = useToast();
  const { invoke: deleteSession, loading: deleteLoading } = useDeleteSessionMutation();
  const { invoke: endSession, loading: endLoading } = useEndSessionMutation();

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

  const loading = action === 'delete' ? deleteLoading : endLoading;

  return { handleSubmit, loading };
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
  questions: QuestionWithAnswer[];
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

// Dialog component for displaying session responses
const ResponseDialog = ({ open, onOpenChange, questions }: ResponseDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Question Response</DialogTitle>
      </DialogHeader>
      {questions?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <EmptyPlaceholderIcon className="h-10 w-10 text-muted-foreground" />
          <p>No questions found</p>
        </div>
      ) : (
        <SessionResponse questions={questions} />
      )}
    </DialogContent>
  </Dialog>
);

// Define menu items with their groups for separator logic
type MenuItemConfig = {
  id: string;
  group: string;
  show: boolean;
  render: () => React.ReactNode;
};

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
}) => {
  const menuItems: MenuItemConfig[] = [
    {
      id: 'viewDetails',
      group: 'view',
      show: showViewDetails,
      render: () => (
        <DropdownMenuItem onClick={onViewDetailsClick} className="cursor-pointer">
          <ZoomInIcon className="w-4 h-4 mr-1" />
          View details
        </DropdownMenuItem>
      ),
    },
    {
      id: 'viewResponse',
      group: 'view',
      show: showViewResponse,
      render: () => (
        <DropdownMenuItem onClick={onResponseClick} className="cursor-pointer">
          <QuestionMarkCircledIcon className="w-4 h-4 mr-1" />
          View Response
        </DropdownMenuItem>
      ),
    },
    {
      id: 'endSession',
      group: 'action',
      show: showEndSession,
      render: () => (
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={isViewOnly || sessionState === 1}
          onClick={onEndClick}
        >
          <CloseCircleIcon className="w-4 h-4 mr-1" />
          End session now
        </DropdownMenuItem>
      ),
    },
    {
      id: 'deleteSession',
      group: 'action',
      show: showDeleteSession,
      render: () => (
        <DropdownMenuItem
          className="cursor-pointer text-destructive"
          disabled={isViewOnly}
          onClick={onDeleteClick}
        >
          <Delete2Icon className="w-4 h-4 mr-1" />
          Delete session
        </DropdownMenuItem>
      ),
    },
  ];

  // Filter items that should be shown
  const visibleItems = menuItems.filter((item) => item.show);

  return (
    <>
      {visibleItems.map((item, index) => {
        const prevItem = index > 0 ? visibleItems[index - 1] : null;
        const needsSeparator = prevItem && prevItem.group !== item.group;

        return (
          <Fragment key={item.id}>
            {needsSeparator && <DropdownMenuSeparator />}
            {item.render()}
          </Fragment>
        );
      })}
    </>
  );
};

// Form component for session actions (delete/end)
const SessionForm = ({ session, open, onOpenChange, onSubmit, type }: SessionFormProps) => {
  const { handleSubmit, loading } = useSessionForm(session, type, onSubmit);

  const descriptions = {
    delete:
      'This will delete all traces of this session from your account. Including in analytics.\nYou should probably only do this for testing reasons.',
    end: 'This will close the content for the user.',
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
          <LoadingButton
            variant={type === 'delete' ? 'destructive' : undefined}
            onClick={handleSubmit}
            loading={loading}
          >
            Yes, {type} session
          </LoadingButton>
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

  const questionAnswers = getOrderedQuestionAnswers(session);

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
        questions={questionAnswers ?? []}
      />
    </>
  );
};

// Display name for debugging purposes
SessionActionDropdownMenu.displayName = 'SessionActionDropdownMenu';
