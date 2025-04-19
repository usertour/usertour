import { useMemberContext } from '@/contexts/member-context';
import { Button } from '@usertour-ui/button';
import { useState, useCallback, useMemo } from 'react';
import { MemberInviteDialog } from './member-invite-dialog';
import type { Subscription } from '@usertour-ui/types';
import { PlanType } from '@usertour-ui/types';
import {
  useGetSubscriptionByProjectIdQuery,
  useCreateCheckoutSessionMutation,
  useCreatePortalSessionMutation,
} from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';

interface MemberListHeaderProps {
  projectId: string;
}

export const MemberListHeader = ({ projectId }: MemberListHeaderProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { refetch, members = [] } = useMemberContext();
  const { toast } = useToast();

  const { invoke: createCheckout } = useCreateCheckoutSessionMutation();
  const { subscription } = useGetSubscriptionByProjectIdQuery(projectId) as {
    subscription: Subscription | null;
  };
  const { invoke: createPortalSession } = useCreatePortalSessionMutation();

  const planType: PlanType = subscription?.planType ?? PlanType.HOBBY;

  const canInviteMembers = useMemo(() => {
    return (planType === PlanType.PRO && members.length < 3) || planType === PlanType.GROWTH;
  }, [planType, members.length]);

  const handleCreate = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleOnClose = useCallback(() => {
    setIsDialogOpen(false);
    refetch();
  }, [refetch]);

  const handleUpgrade = async () => {
    try {
      // If current plan is hobby or no plan, create checkout session for upgrade
      if (!subscription?.planType || subscription?.planType === PlanType.HOBBY) {
        const url = await createCheckout({
          projectId,
          planType: PlanType.PRO,
          interval: 'monthly',
        });
        window.location.href = url;
      } else {
        // For other plans, create portal session for management
        const url = await createPortalSession(projectId);
        window.location.href = url;
      }
    } catch (_) {
      toast({
        title: 'Error',
        description: 'Failed to create checkout session. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold tracking-tight">Team</h3>
        <Button onClick={canInviteMembers ? handleCreate : handleUpgrade} className="flex-none">
          {canInviteMembers
            ? 'Invite team member'
            : planType === PlanType.HOBBY
              ? 'Upgrade to Pro'
              : 'Upgrade to Growth'}
        </Button>
      </div>
      <MemberInviteDialog isOpen={isDialogOpen} onClose={handleOnClose} />
    </div>
  );
};

MemberListHeader.displayName = 'MemberListHeader';
