import { useMemberContext } from '@/contexts/member-context';
import { Button } from '@usertour-ui/button';
import { useState, useCallback } from 'react';
import { MemberInviteDialog } from './member-invite-dialog';
import type { Subscription } from '@usertour-ui/types';
import {
  useGetSubscriptionByProjectIdQuery,
  useCreateCheckoutSessionMutation,
} from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';

interface MemberListHeaderProps {
  projectId: string;
}

export const MemberListHeader = ({ projectId }: MemberListHeaderProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { refetch } = useMemberContext();
  const { toast } = useToast();

  const { invoke: createCheckout } = useCreateCheckoutSessionMutation();
  const { subscription } = useGetSubscriptionByProjectIdQuery(projectId) as {
    subscription: Subscription | null;
  };
  const planType = subscription?.planType ?? 'hobby';

  const handleCreate = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleOnClose = useCallback(() => {
    setIsDialogOpen(false);
    refetch();
  }, [refetch]);

  const handleUpgrade = useCallback(async () => {
    try {
      const url = await createCheckout({
        projectId,
        planType: 'pro',
        interval: 'monthly',
      });
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create checkout session. Please try again later.',
        variant: 'destructive',
      });
    }
  }, [createCheckout, projectId, toast]);

  return (
    <>
      <div className="relative">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between">
            <h3 className="text-2xl font-semibold tracking-tight">Team</h3>
            {planType !== 'hobby' ? (
              <Button onClick={handleCreate} className="flex-none">
                Invite team member
              </Button>
            ) : (
              <Button onClick={handleUpgrade} className="flex-none">
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>
      </div>
      <MemberInviteDialog isOpen={isDialogOpen} onClose={handleOnClose} />
    </>
  );
};

MemberListHeader.displayName = 'MemberListHeader';
