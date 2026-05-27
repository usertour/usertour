import { useAppContext } from '@/contexts/app-context';
import { DestructiveConfirmDialog } from '@usertour/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import {
  CloseCircleIcon,
  Delete2Icon,
  EmptyPlaceholderIcon,
  QuestionMarkCircledIcon,
  ZoomInIcon,
} from '@usertour/icons';
import { useDeleteSessionMutation, useEndSessionMutation } from '@usertour/hooks';
import { BizSession } from '@usertour/types';
import { Fragment, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@usertour/dialog';
import { SessionResponse } from '@/components/sessions/session-detail';
import { getOrderedQuestionAnswers, QuestionWithAnswer } from '@/utils/session';

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
const ResponseDialog = ({ open, onOpenChange, questions }: ResponseDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('sessionActions.responseDialog.title')}</DialogTitle>
        </DialogHeader>
        {questions?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <EmptyPlaceholderIcon className="h-10 w-10 text-muted-foreground" />
            <p>{t('sessionActions.responseDialog.empty')}</p>
          </div>
        ) : (
          <SessionResponse questions={questions} />
        )}
      </DialogContent>
    </Dialog>
  );
};

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
  const { t } = useTranslation();
  const menuItems: MenuItemConfig[] = [
    {
      id: 'viewDetails',
      group: 'view',
      show: showViewDetails,
      render: () => (
        <DropdownMenuItem onClick={onViewDetailsClick} className="cursor-pointer">
          <ZoomInIcon className="w-4 h-4 mr-1" />
          {t('sessionActions.menu.viewDetails')}
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
          {t('sessionActions.menu.viewResponse')}
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
          {t('sessionActions.menu.endSession')}
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
          {t('sessionActions.menu.deleteSession')}
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

// Thin wrapper over DestructiveConfirmDialog. Both delete-session and
// end-session go through the same destructive confirm chrome (icon
// badge, red button, max-w-xl) — they only differ in mutation hook and
// i18n key namespace. End-session uses the same destructive styling as
// delete because both are admin-driven, one-way state changes; whether
// the user can re-trigger the content later depends on its trigger
// rules and content type, not on this dialog.
const SessionForm = ({ session, open, onOpenChange, onSubmit, type }: SessionFormProps) => {
  const { t } = useTranslation();
  const { invoke: deleteSession } = useDeleteSessionMutation();
  const { invoke: endSession } = useEndSessionMutation();

  // Managed mode: the primitive owns spinner + success/failure toast +
  // dialog-close-on-success. `endSession` has server-side codepaths
  // that legitimately resolve `false` (session not found, already
  // ended, content type doesn't support dismiss — analytics.service
  // line 1521/1533) — unmanaged mode used to swallow those silently
  // and leave the dialog stuck with a stopped spinner.
  return (
    <DestructiveConfirmDialog
      title={t(`sessionActions.${type}.title`)}
      description={t(`sessionActions.${type}.description`)}
      confirmLabel={t(`sessionActions.${type}.confirmButton`)}
      cancelLabel={t('sessionActions.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      invoke={() => (type === 'delete' ? deleteSession(session.id) : endSession(session.id))}
      successToast={
        type === 'delete'
          ? t('sessionActions.toast.deleteSuccess')
          : t('sessionActions.toast.endSuccess')
      }
      failureToast={
        type === 'delete'
          ? t('sessionActions.toast.deleteFailed')
          : t('sessionActions.toast.endFailed')
      }
      onSettled={onSubmit}
    />
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
      <DropdownMenu modal={false}>
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
        // Managed mode owns dialog close on success and intentionally
        // leaves the dialog open on soft-failure / throw so the user
        // gets retryable feedback. Only escalate the success branch.
        onSubmit={(success) => {
          if (success) {
            onDeleteSuccess?.();
          }
        }}
      />

      {/* Session end confirmation dialog */}
      <SessionForm
        type="end"
        session={session}
        open={endOpen}
        onOpenChange={setEndOpen}
        onSubmit={(success) => {
          if (success) {
            onEndSuccess?.();
          }
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
